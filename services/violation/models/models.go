package models

import "time"

type Violation struct {
	ID                 string    `json:"id"`
	Plate              string    `json:"plate"`
	ViolationType      string    `json:"violation_type"`
	Location           string    `json:"location"`
	ViolationTimestamp time.Time `json:"violation_timestamp"`
	PhotoURL           string    `json:"photo_url"`
	Status             string    `json:"status"`
	SubmittedBy        *string   `json:"submitted_by"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type FineCalculation struct {
	ID               string    `json:"id"`
	ViolationID      string    `json:"violation_id"`
	RuleVersionID    string    `json:"rule_version_id"`
	BaseAmount       float64   `json:"base_amount"`
	TimeMultiplier   float64   `json:"time_multiplier"`
	RepeatMultiplier float64   `json:"repeat_multiplier"`
	TotalFine        float64   `json:"total_fine"`
	CalculatedAt     time.Time `json:"calculated_at"`
}

type Invoice struct {
	ID          string    `json:"id"`
	ViolationID string    `json:"violation_id"`
	UserID      *string   `json:"user_id"`
	Amount      float64   `json:"amount"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ViolationWithDetails struct {
	Violation
	FineCalculation *FineCalculation `json:"fine_calculation,omitempty"`
	Invoice         *Invoice         `json:"invoice,omitempty"`
	PaymentStatus   *string          `json:"payment_status,omitempty"`
	TransactionID   *string          `json:"transaction_id,omitempty"`
}

type CreateViolationRequest struct {
	Plate              string    `json:"plate"`
	ViolationType      string    `json:"violation_type"`
	Location           string    `json:"location"`
	ViolationTimestamp time.Time `json:"violation_timestamp"`
}

type FineRuleServiceResponse struct {
	BaseAmount       float64 `json:"base_amount"`
	TimeMultiplier   float64 `json:"time_multiplier"`
	RepeatMultiplier float64 `json:"repeat_multiplier"`
	TotalFine        float64 `json:"total_fine"`
	RuleVersionID    string  `json:"rule_version_id"`
	RuleVersion      int     `json:"rule_version"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
