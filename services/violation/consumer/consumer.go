package consumer

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"violation/models"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
)

type FineCalculator struct {
	DB          *sql.DB
	RabbitMQURL string
	FineRuleURL string
}

func NewFineCalculator(db *sql.DB, rabbitMQURL, fineRuleURL string) *FineCalculator {
	return &FineCalculator{
		DB:          db,
		RabbitMQURL: rabbitMQURL,
		FineRuleURL: fineRuleURL,
	}
}

func (c *FineCalculator) Start() error {
	conn, err := amqp.Dial(c.RabbitMQURL)
	if err != nil {
		return fmt.Errorf("connect to rabbitmq: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("open channel: %w", err)
	}

	err = ch.ExchangeDeclare("violations", "topic", true, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("declare exchange: %w", err)
	}

	q, err := ch.QueueDeclare("violation_created_fine_calc", true, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("declare queue: %w", err)
	}

	err = ch.QueueBind(q.Name, "violation.created", "violations", false, nil)
	if err != nil {
		return fmt.Errorf("bind queue: %w", err)
	}

	msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("consume: %w", err)
	}

	go func() {
		for msg := range msgs {
			c.handleViolationCreated(msg)
			msg.Ack(false)
		}
	}()

	log.Println("fine calculator consumer started")
	return nil
}

func (c *FineCalculator) handleViolationCreated(msg amqp.Delivery) {
	var event struct {
		ViolationID string `json:"violation_id"`
	}
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("invalid event body: %v", err)
		return
	}

	var v models.Violation
	err := c.DB.QueryRow(
		"SELECT id, plate, violation_type, violation_timestamp FROM violations.violations WHERE id = $1",
		event.ViolationID,
	).Scan(&v.ID, &v.Plate, &v.ViolationType, &v.ViolationTimestamp)
	if err != nil {
		log.Printf("query violation %s: %v", event.ViolationID, err)
		return
	}

	reqBody, err := json.Marshal(map[string]interface{}{
		"violation_type":      v.ViolationType,
		"violation_timestamp": v.ViolationTimestamp,
		"plate":               v.Plate,
	})
	if err != nil {
		log.Printf("marshal calculate request: %v", err)
		return
	}

	resp, err := http.Post(c.FineRuleURL+"/api/rules/calculate", "application/json", bytes.NewReader(reqBody))
	if err != nil {
		log.Printf("call fine-rule service: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("fine-rule service returned %d", resp.StatusCode)
		return
	}

	var calcResp models.FineRuleServiceResponse
	if err := json.NewDecoder(resp.Body).Decode(&calcResp); err != nil {
		log.Printf("decode fine-rule response: %v", err)
		return
	}

	calcID := uuid.New().String()
	now := time.Now()
	_, err = c.DB.Exec(
		`INSERT INTO violations.fine_calculations (id, violation_id, rule_version_id, base_amount, time_multiplier, repeat_multiplier, total_fine, calculated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		calcID, v.ID, calcResp.RuleVersionID, calcResp.BaseAmount, calcResp.TimeMultiplier,
		calcResp.RepeatMultiplier, calcResp.TotalFine, now,
	)
	if err != nil {
		log.Printf("insert fine calculation: %v", err)
		return
	}

	var ownerID *string
	err = c.DB.QueryRow(
		"SELECT user_id FROM public.member_plates WHERE plate = $1 LIMIT 1",
		v.Plate,
	).Scan(&ownerID)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("lookup plate owner: %v", err)
	}

	var userIDArg interface{} = nil
	if ownerID != nil {
		userIDArg = *ownerID
	}

	invoiceID := uuid.New().String()
	_, err = c.DB.Exec(
		`INSERT INTO violations.invoices (id, violation_id, user_id, amount, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, 'unpaid', $5, $5)`,
		invoiceID, v.ID, userIDArg, calcResp.TotalFine, now,
	)
	if err != nil {
		log.Printf("create invoice: %v", err)
		return
	}

	_, err = c.DB.Exec(
		"UPDATE violations.violations SET status = 'invoiced', updated_at = $1 WHERE id = $2",
		now, v.ID,
	)
	if err != nil {
		log.Printf("update violation status: %v", err)
		return
	}

	invoiceEvent, _ := json.Marshal(map[string]interface{}{
		"violation_id": v.ID,
		"invoice_id":   invoiceID,
		"user_id":      ownerID,
		"amount":       calcResp.TotalFine,
	})

	conn, err := amqp.Dial(c.RabbitMQURL)
	if err != nil {
		log.Printf("connect rabbitmq for invoice event: %v", err)
		return
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Printf("open channel for invoice event: %v", err)
		return
	}
	defer ch.Close()

	err = ch.Publish("violations", "invoice.created", false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        invoiceEvent,
	})
	if err != nil {
		log.Printf("publish invoice.created: %v", err)
		return
	}

	log.Printf("processed violation %s: fine=%v, invoice=%s", v.ID, calcResp.TotalFine, invoiceID)
}
