package models

import "time"

type FineRule struct {
	ID            string    `json:"id"`
	Version       int       `json:"version"`
	Status        string    `json:"status"`
	CreatedBy     *string   `json:"created_by"`
	EffectiveFrom time.Time `json:"effective_from"`
	CreatedAt     time.Time `json:"created_at"`
}

type FineRuleDetail struct {
	ID                  string  `json:"id"`
	RuleID              string  `json:"rule_id"`
	ViolationType       string  `json:"violation_type"`
	BaseAmount          float64 `json:"base_amount"`
	TimeMultiplierStart string  `json:"time_multiplier_start"`
	TimeMultiplierEnd   string  `json:"time_multiplier_end"`
	TimeMultiplierValue float64 `json:"time_multiplier_value"`
	RepeatCountMin      int     `json:"repeat_count_min"`
	RepeatMultiplier    float64 `json:"repeat_multiplier"`
}

type FineRuleWithDetails struct {
	FineRule
	Details []FineRuleDetail `json:"details"`
}

type BaseAmountInput struct {
	ViolationType string  `json:"violation_type"`
	Amount        float64 `json:"amount"`
}

type TimeMultiplierInput struct {
	Start string  `json:"start"`
	End   string  `json:"end"`
	Value float64 `json:"value"`
}

type RepeatMultiplierInput struct {
	MinCount   int     `json:"min_count"`
	Multiplier float64 `json:"multiplier"`
}

type CreateRuleRequest struct {
	BaseAmounts       []BaseAmountInput       `json:"base_amounts"`
	TimeMultipliers   []TimeMultiplierInput   `json:"time_multipliers"`
	RepeatMultipliers []RepeatMultiplierInput `json:"repeat_multipliers"`
}

type CalculateRequest struct {
	ViolationType      string    `json:"violation_type"`
	ViolationTimestamp  time.Time `json:"violation_timestamp"`
	Plate              string    `json:"plate"`
}

type CalculateResponse struct {
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
