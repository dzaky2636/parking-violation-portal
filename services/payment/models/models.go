package models

import "time"

type PaymentRequest struct {
	InvoiceID string `json:"invoice_id"`
	Scenario  string `json:"scenario"`
}

type PaymentResponse struct {
	Status        string `json:"status"`
	TransactionID string `json:"transaction_id"`
}

type PaymentTransaction struct {
	ID            string    `json:"id"`
	InvoiceID     string    `json:"invoice_id"`
	TransactionID string    `json:"transaction_id"`
	Status        string    `json:"status"`
	Scenario      string    `json:"scenario"`
	CreatedAt     time.Time `json:"created_at"`
}

type Invoice struct {
	ID          string  `json:"id"`
	ViolationID string  `json:"violation_id"`
	UserID      *string `json:"user_id"`
	Amount      float64 `json:"amount"`
	Status      string  `json:"status"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
