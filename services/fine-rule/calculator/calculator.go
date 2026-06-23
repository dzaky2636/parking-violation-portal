package calculator

import (
	"database/sql"
	"fmt"
	"time"
)

type FineResult struct {
	BaseAmount       float64
	TimeMultiplier   float64
	RepeatMultiplier float64
	TotalFine        float64
	RuleVersionID    string
	RuleVersion      int
}

func Calculate(db *sql.DB, violationType string, timestamp time.Time, plate string) (*FineResult, error) {
	var ruleID string
	var ruleVersion int
	err := db.QueryRow(`SELECT id, version FROM rules.fine_rules WHERE status = 'active' ORDER BY version DESC LIMIT 1`).Scan(&ruleID, &ruleVersion)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no active fine rule found")
	}
	if err != nil {
		return nil, fmt.Errorf("query active rule: %w", err)
	}

	var baseAmount float64
	err = db.QueryRow(`SELECT base_amount FROM rules.fine_rule_details WHERE rule_id = $1 AND violation_type = $2 LIMIT 1`, ruleID, violationType).Scan(&baseAmount)
	if err != nil {
		return nil, fmt.Errorf("query base amount for %s: %w", violationType, err)
	}

	timeStr := timestamp.Format("15:04:05")
	var timeMultiplier float64
	err = db.QueryRow(`
		SELECT time_multiplier_value FROM rules.fine_rule_details
		WHERE rule_id = $1 AND violation_type = $2
		AND (
			(time_multiplier_start <= time_multiplier_end AND $3::TIME >= time_multiplier_start AND $3::TIME < time_multiplier_end)
			OR
			(time_multiplier_start > time_multiplier_end AND ($3::TIME >= time_multiplier_start OR $3::TIME < time_multiplier_end))
		)
		LIMIT 1
	`, ruleID, violationType, timeStr).Scan(&timeMultiplier)
	if err != nil {
		return nil, fmt.Errorf("query time multiplier: %w", err)
	}

	var priorCount int
	ninetyDaysAgo := timestamp.AddDate(0, 0, -90)
	err = db.QueryRow(`
		SELECT COUNT(*) FROM violations.violations v
		JOIN violations.invoices i ON i.violation_id = v.id
		WHERE v.plate = $1
		AND v.violation_timestamp >= $2 AND v.violation_timestamp < $3
		AND i.status = 'unpaid'
	`, plate, ninetyDaysAgo, timestamp).Scan(&priorCount)
	if err != nil {
		return nil, fmt.Errorf("query prior violations: %w", err)
	}

	var repeatMultiplier float64
	err = db.QueryRow(`
		SELECT repeat_multiplier FROM rules.fine_rule_details
		WHERE rule_id = $1 AND violation_type = $2 AND repeat_count_min <= $3
		ORDER BY repeat_count_min DESC LIMIT 1
	`, ruleID, violationType, priorCount).Scan(&repeatMultiplier)
	if err != nil {
		return nil, fmt.Errorf("query repeat multiplier: %w", err)
	}

	totalFine := baseAmount * timeMultiplier * repeatMultiplier

	return &FineResult{
		BaseAmount:       baseAmount,
		TimeMultiplier:   timeMultiplier,
		RepeatMultiplier: repeatMultiplier,
		TotalFine:        totalFine,
		RuleVersionID:    ruleID,
		RuleVersion:      ruleVersion,
	}, nil
}
