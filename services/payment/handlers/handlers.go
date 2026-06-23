package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"payment/mock"
	"payment/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Handler struct {
	DB              *sql.DB
	PaymentService  *mock.PaymentService
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, models.ErrorResponse{Error: msg})
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Post("/api/payments", h.ProcessPayment)
	return r
}

func (h *Handler) ProcessPayment(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req models.PaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.InvoiceID == "" {
		writeError(w, http.StatusBadRequest, "invoice_id is required")
		return
	}
	if req.Scenario != "success" && req.Scenario != "failed" {
		writeError(w, http.StatusBadRequest, "scenario must be 'success' or 'failed'")
		return
	}

	var invoice models.Invoice
	err := h.DB.QueryRow(
		"SELECT id, violation_id, user_id, amount, status FROM violations.invoices WHERE id = $1",
		req.InvoiceID,
	).Scan(&invoice.ID, &invoice.ViolationID, &invoice.UserID, &invoice.Amount, &invoice.Status)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "invoice not found")
		return
	}
	if err != nil {
		log.Printf("query invoice error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to query invoice")
		return
	}

	if invoice.UserID != nil && *invoice.UserID != userID {
		writeError(w, http.StatusForbidden, "invoice does not belong to this user")
		return
	}

	if invoice.Status != "unpaid" {
		writeError(w, http.StatusBadRequest, "invoice is not in unpaid status")
		return
	}

	status, transactionID, err := h.PaymentService.Charge(req.InvoiceID, invoice.Amount, req.Scenario)
	if err != nil {
		log.Printf("mock charge error: %v", err)
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	now := time.Now()
	paymentID := uuid.New().String()
	_, err = h.DB.Exec(
		`INSERT INTO payments.transactions (id, invoice_id, transaction_id, status, scenario, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		paymentID, req.InvoiceID, transactionID, status, req.Scenario, now,
	)
	if err != nil {
		log.Printf("insert transaction error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to record transaction")
		return
	}

	if status == "paid" {
		_, err = h.DB.Exec("UPDATE violations.invoices SET status = 'paid', updated_at = $1 WHERE id = $2", now, req.InvoiceID)
		if err != nil {
			log.Printf("update invoice error: %v", err)
		}
		_, err = h.DB.Exec("UPDATE violations.violations SET status = 'paid', updated_at = $1 WHERE id = $2", now, invoice.ViolationID)
		if err != nil {
			log.Printf("update violation error: %v", err)
		}
	}

	writeJSON(w, http.StatusOK, models.PaymentResponse{
		Status:        status,
		TransactionID: transactionID,
	})
}
