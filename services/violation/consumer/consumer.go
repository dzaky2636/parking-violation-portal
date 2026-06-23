package consumer

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"violation/eventbus"
	"violation/models"

	"github.com/google/uuid"
)

type FineCalculator struct {
	DB          *sql.DB
	Bus         *eventbus.Bus
	FineRuleURL string
}

func NewFineCalculator(db *sql.DB, bus *eventbus.Bus, fineRuleURL string) *FineCalculator {
	return &FineCalculator{
		DB:          db,
		Bus:         bus,
		FineRuleURL: fineRuleURL,
	}
}

func (c *FineCalculator) Start() {
	c.Bus.Subscribe("violation.created", func(body []byte) {
		c.handleViolationCreated(body)
	})
	log.Println("fine calculator consumer started")
}

func (c *FineCalculator) handleViolationCreated(body []byte) {
	var event struct {
		ViolationID string `json:"violation_id"`
	}
	if err := json.Unmarshal(body, &event); err != nil {
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
	_ = invoiceEvent

	log.Printf("processed violation %s: fine=%v, invoice=%s", v.ID, calcResp.TotalFine, invoiceID)
}
