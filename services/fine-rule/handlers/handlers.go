package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"fine-rule/calculator"
	"fine-rule/models"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Handler struct {
	DB *sql.DB
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/api/rules/active", h.GetActiveRule)
	r.Get("/api/rules", h.ListRules)
	r.Get("/api/rules/{id}", h.GetRule)
	r.Post("/api/rules", h.CreateRule)
	r.Post("/api/rules/calculate", h.Calculate)
	return r
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, models.ErrorResponse{Error: msg})
}

func (h *Handler) GetActiveRule(w http.ResponseWriter, r *http.Request) {
	rule, err := h.getRuleByQuery("SELECT id, version, status, created_by, effective_from, created_at FROM rules.fine_rules WHERE status = 'active' ORDER BY version DESC LIMIT 1")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "no active rule found")
		return
	}
	details, err := h.getRuleDetails(rule.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load rule details")
		return
	}
	writeJSON(w, http.StatusOK, models.FineRuleWithDetails{FineRule: *rule, Details: details})
}

func (h *Handler) ListRules(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query("SELECT id, version, status, created_by, effective_from, created_at FROM rules.fine_rules ORDER BY version DESC")
	if err != nil {
		log.Printf("list rules query error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to query rules")
		return
	}
	defer rows.Close()

	var rules []models.FineRule
	var ruleIDs []string
	for rows.Next() {
		var rule models.FineRule
		if err := scanRule(rows, &rule); err != nil {
			log.Printf("scan rule error: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to scan rule")
			return
		}
		rules = append(rules, rule)
		ruleIDs = append(ruleIDs, rule.ID)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "rule iteration error")
		return
	}

	detailsMap, err := h.batchGetRuleDetails(ruleIDs)
	if err != nil {
		log.Printf("batch get rule details error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to load rule details")
		return
	}

	result := make([]models.FineRuleWithDetails, 0, len(rules))
	for _, rule := range rules {
		result = append(result, models.FineRuleWithDetails{
			FineRule: rule,
			Details:  detailsMap[rule.ID],
		})
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) GetRule(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rule, err := h.getRuleByQuery("SELECT id, version, status, created_by, effective_from, created_at FROM rules.fine_rules WHERE id = $1", id)
	if err != nil {
		writeError(w, http.StatusNotFound, "rule not found")
		return
	}
	details, err := h.getRuleDetails(rule.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load rule details")
		return
	}
	writeJSON(w, http.StatusOK, models.FineRuleWithDetails{FineRule: *rule, Details: details})
}

func (h *Handler) CreateRule(w http.ResponseWriter, r *http.Request) {
	var req models.CreateRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.BaseAmounts) == 0 || len(req.TimeMultipliers) == 0 || len(req.RepeatMultipliers) == 0 {
		writeError(w, http.StatusBadRequest, "base_amounts, time_multipliers, and repeat_multipliers are required")
		return
	}

	createdBy := r.Header.Get("X-User-ID")

	tx, err := h.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to start transaction")
		return
	}
	defer tx.Rollback()

	var nextVersion int
	if err := tx.QueryRow("SELECT COALESCE(MAX(version), 0) + 1 FROM rules.fine_rules").Scan(&nextVersion); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to compute next version")
		return
	}

	if _, err := tx.Exec("UPDATE rules.fine_rules SET status = 'superseded' WHERE status = 'active'"); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to supersede active rule")
		return
	}

	ruleID := uuid.New().String()
	now := time.Now()
	var createdByNull interface{} = nil
	if createdBy != "" {
		createdByNull = createdBy
	}
	_, err = tx.Exec(
		"INSERT INTO rules.fine_rules (id, version, status, created_by, effective_from, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
		ruleID, nextVersion, "active", createdByNull, now, now,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to insert rule")
		return
	}

		for _, ba := range req.BaseAmounts {
		for _, tm := range req.TimeMultipliers {
			start := tm.Start
			if len(start) == 5 {
				start += ":00"
			}
			end := tm.End
			if len(end) == 5 {
				end += ":00"
			}
			for _, rm := range req.RepeatMultipliers {
				detailID := uuid.New().String()
				_, err = tx.Exec(
					`INSERT INTO rules.fine_rule_details (id, rule_id, violation_type, base_amount, time_multiplier_start, time_multiplier_end, time_multiplier_value, repeat_count_min, repeat_multiplier)
					 VALUES ($1, $2, $3, $4, $5::TIME, $6::TIME, $7, $8, $9)`,
					detailID, ruleID, ba.ViolationType, ba.Amount, start, end, tm.Value, rm.MinCount, rm.Multiplier,
				)
				if err != nil {
					log.Printf("insert rule detail error: %v", err)
					writeError(w, http.StatusInternalServerError, "failed to insert rule detail")
					return
				}
			}
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit rule")
		return
	}

	rule, err := h.getRuleByQuery("SELECT id, version, status, created_by, effective_from, created_at FROM rules.fine_rules WHERE id = $1", ruleID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "rule created but failed to fetch")
		return
	}
	details, err := h.getRuleDetails(rule.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "rule created but failed to load details")
		return
	}
	writeJSON(w, http.StatusCreated, models.FineRuleWithDetails{FineRule: *rule, Details: details})
}

func (h *Handler) Calculate(w http.ResponseWriter, r *http.Request) {
	var req models.CalculateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := calculator.Calculate(h.DB, req.ViolationType, req.ViolationTimestamp, req.Plate)
	if err != nil {
		log.Printf("calculation error: %v", err)
		writeError(w, http.StatusInternalServerError, "calculation failed")
		return
	}

	writeJSON(w, http.StatusOK, models.CalculateResponse{
		BaseAmount:       result.BaseAmount,
		TimeMultiplier:   result.TimeMultiplier,
		RepeatMultiplier: result.RepeatMultiplier,
		TotalFine:        result.TotalFine,
		RuleVersionID:    result.RuleVersionID,
		RuleVersion:      result.RuleVersion,
	})
}

func (h *Handler) getRuleByQuery(query string, args ...interface{}) (*models.FineRule, error) {
	var rule models.FineRule
	var createdBy sql.NullString
	err := h.DB.QueryRow(query, args...).Scan(&rule.ID, &rule.Version, &rule.Status, &createdBy, &rule.EffectiveFrom, &rule.CreatedAt)
	if err != nil {
		return nil, err
	}
	if createdBy.Valid {
		rule.CreatedBy = &createdBy.String
	}
	return &rule, nil
}

func (h *Handler) getRuleDetails(ruleID string) ([]models.FineRuleDetail, error) {
	rows, err := h.DB.Query(`
		SELECT id, rule_id, violation_type, base_amount,
			time_multiplier_start::VARCHAR, time_multiplier_end::VARCHAR,
			time_multiplier_value, repeat_count_min, repeat_multiplier
		FROM rules.fine_rule_details
		WHERE rule_id = $1
		ORDER BY violation_type, repeat_count_min, time_multiplier_start
	`, ruleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var details []models.FineRuleDetail
	for rows.Next() {
		var d models.FineRuleDetail
		if err := rows.Scan(&d.ID, &d.RuleID, &d.ViolationType, &d.BaseAmount,
			&d.TimeMultiplierStart, &d.TimeMultiplierEnd,
			&d.TimeMultiplierValue, &d.RepeatCountMin, &d.RepeatMultiplier); err != nil {
			return nil, err
		}
		details = append(details, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if details == nil {
		details = []models.FineRuleDetail{}
	}
	return details, nil
}

func (h *Handler) batchGetRuleDetails(ruleIDs []string) (map[string][]models.FineRuleDetail, error) {
	if len(ruleIDs) == 0 {
		return map[string][]models.FineRuleDetail{}, nil
	}

	rows, err := h.DB.Query(`
		SELECT id, rule_id, violation_type, base_amount,
			time_multiplier_start::VARCHAR, time_multiplier_end::VARCHAR,
			time_multiplier_value, repeat_count_min, repeat_multiplier
		FROM rules.fine_rule_details
		WHERE rule_id = ANY($1)
		ORDER BY violation_type, repeat_count_min, time_multiplier_start
	`, pq.Array(ruleIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	detailsMap := make(map[string][]models.FineRuleDetail)
	for rows.Next() {
		var d models.FineRuleDetail
		if err := rows.Scan(&d.ID, &d.RuleID, &d.ViolationType, &d.BaseAmount,
			&d.TimeMultiplierStart, &d.TimeMultiplierEnd,
			&d.TimeMultiplierValue, &d.RepeatCountMin, &d.RepeatMultiplier); err != nil {
			return nil, err
		}
		detailsMap[d.RuleID] = append(detailsMap[d.RuleID], d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return detailsMap, nil
}

func scanRule(rows *sql.Rows, rule *models.FineRule) error {
	var createdBy sql.NullString
	err := rows.Scan(&rule.ID, &rule.Version, &rule.Status, &createdBy, &rule.EffectiveFrom, &rule.CreatedAt)
	if err != nil {
		return err
	}
	if createdBy.Valid {
		rule.CreatedBy = &createdBy.String
	}
	return nil
}
