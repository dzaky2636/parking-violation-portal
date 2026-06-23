package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"violation/eventbus"
	"violation/models"
	"violation/storage"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Handler struct {
	DB      *sql.DB
	Storage *storage.SupabaseStorage
	Bus     *eventbus.Bus
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
	r.Post("/api/violations", h.CreateViolation)
	r.Get("/api/violations", h.ListViolations)
	r.Get("/api/violations/{id}", h.GetViolation)
	return r
}

func (h *Handler) CreateViolation(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid multipart form")
		return
	}

	plate := r.FormValue("plate")
	violationType := r.FormValue("violation_type")
	location := r.FormValue("location")
	timestampStr := r.FormValue("violation_timestamp")

	if plate == "" || violationType == "" || location == "" || timestampStr == "" {
		writeError(w, http.StatusBadRequest, "plate, violation_type, location, and violation_timestamp are required")
		return
	}

	violationTimestamp, err := time.Parse(time.RFC3339, timestampStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid violation_timestamp format")
		return
	}

	var photoURL string
	file, header, err := r.FormFile("photo")
	if err == nil {
		defer file.Close()
		photoURL, err = h.Storage.UploadPhoto(file, header)
		if err != nil {
			log.Printf("photo upload error: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to upload photo")
			return
		}
	}

	submittedBy := r.Header.Get("X-User-ID")
	var submittedByNull interface{} = nil
	if submittedBy != "" {
		submittedByNull = submittedBy
	}

	violationID := uuid.New().String()
	now := time.Now()
	_, err = h.DB.Exec(
		`INSERT INTO violations.violations (id, plate, violation_type, location, violation_timestamp, photo_url, status, submitted_by, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $8)`,
		violationID, plate, violationType, location, violationTimestamp, photoURL, submittedByNull, now,
	)
	if err != nil {
		log.Printf("insert violation error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to create violation")
		return
	}

	eventBody, _ := json.Marshal(map[string]string{"violation_id": violationID})
	h.Bus.Publish("violation.created", eventBody)

	var violation models.Violation
	err = h.DB.QueryRow(
		`SELECT id, plate, violation_type, location, violation_timestamp, photo_url, status, submitted_by, created_at, updated_at
		 FROM violations.violations WHERE id = $1`, violationID,
	).Scan(&violation.ID, &violation.Plate, &violation.ViolationType, &violation.Location,
		&violation.ViolationTimestamp, &violation.PhotoURL, &violation.Status,
		&violation.SubmittedBy, &violation.CreatedAt, &violation.UpdatedAt)
	if err != nil {
		log.Printf("fetch created violation error: %v", err)
		writeError(w, http.StatusInternalServerError, "violation created but failed to fetch")
		return
	}

	writeJSON(w, http.StatusCreated, violation)
}

func (h *Handler) ListViolations(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	userRole := r.Header.Get("X-User-Role")

	var rows *sql.Rows
	var err error
	if userRole == "member" && userID != "" {
		rows, err = h.DB.Query(`
			SELECT v.id, v.plate, v.violation_type, v.location, v.violation_timestamp,
				v.photo_url, v.status, v.submitted_by, v.created_at, v.updated_at,
				fc.id, fc.violation_id, fc.rule_version_id, fc.base_amount, fc.time_multiplier,
				fc.repeat_multiplier, fc.total_fine, fc.calculated_at,
				i.id, i.violation_id, i.user_id, i.amount, i.status, i.created_at, i.updated_at,
				pt.status, pt.transaction_id
			FROM violations.violations v
			LEFT JOIN violations.fine_calculations fc ON fc.violation_id = v.id
			LEFT JOIN violations.invoices i ON i.violation_id = v.id
			LEFT JOIN LATERAL (
				SELECT pt.status, pt.transaction_id
				FROM payments.transactions pt
				WHERE pt.invoice_id = i.id
				ORDER BY pt.created_at DESC
				LIMIT 1
			) pt ON true
			JOIN public.member_plates mp ON mp.plate = v.plate
			WHERE mp.user_id = $1
			ORDER BY v.violation_timestamp DESC
		`, userID)
	} else {
		rows, err = h.DB.Query(`
			SELECT v.id, v.plate, v.violation_type, v.location, v.violation_timestamp,
				v.photo_url, v.status, v.submitted_by, v.created_at, v.updated_at,
				fc.id, fc.violation_id, fc.rule_version_id, fc.base_amount, fc.time_multiplier,
				fc.repeat_multiplier, fc.total_fine, fc.calculated_at,
				i.id, i.violation_id, i.user_id, i.amount, i.status, i.created_at, i.updated_at,
				pt.status, pt.transaction_id
			FROM violations.violations v
			LEFT JOIN violations.fine_calculations fc ON fc.violation_id = v.id
			LEFT JOIN violations.invoices i ON i.violation_id = v.id
			LEFT JOIN LATERAL (
				SELECT pt.status, pt.transaction_id
				FROM payments.transactions pt
				WHERE pt.invoice_id = i.id
				ORDER BY pt.created_at DESC
				LIMIT 1
			) pt ON true
			ORDER BY v.violation_timestamp DESC
		`)
	}
	if err != nil {
		log.Printf("list violations query error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to query violations")
		return
	}
	defer rows.Close()

	violations := make([]models.ViolationWithDetails, 0)
	for rows.Next() {
		var v models.Violation
		var fcID, fcViolationID, fcRuleVersionID sql.NullString
		var fcBaseAmount, fcTimeMult, fcRepeatMult, fcTotalFine sql.NullFloat64
		var fcCalculatedAt sql.NullTime
		var invID, invViolationID, invUserID, invStatus sql.NullString
		var invAmount sql.NullFloat64
		var invCreatedAt, invUpdatedAt sql.NullTime
		var paymentStatus, transactionID sql.NullString

		err := rows.Scan(
			&v.ID, &v.Plate, &v.ViolationType, &v.Location, &v.ViolationTimestamp,
			&v.PhotoURL, &v.Status, &v.SubmittedBy, &v.CreatedAt, &v.UpdatedAt,
			&fcID, &fcViolationID, &fcRuleVersionID, &fcBaseAmount, &fcTimeMult,
			&fcRepeatMult, &fcTotalFine, &fcCalculatedAt,
			&invID, &invViolationID, &invUserID, &invAmount, &invStatus, &invCreatedAt, &invUpdatedAt,
			&paymentStatus, &transactionID,
		)
		if err != nil {
			log.Printf("scan violation row error: %v", err)
			writeError(w, http.StatusInternalServerError, "failed to scan violation")
			return
		}

		vd := models.ViolationWithDetails{Violation: v}

		if fcID.Valid {
			vd.FineCalculation = &models.FineCalculation{
				ID:               fcID.String,
				ViolationID:      fcViolationID.String,
				RuleVersionID:    fcRuleVersionID.String,
				BaseAmount:       fcBaseAmount.Float64,
				TimeMultiplier:   fcTimeMult.Float64,
				RepeatMultiplier: fcRepeatMult.Float64,
				TotalFine:        fcTotalFine.Float64,
				CalculatedAt:     fcCalculatedAt.Time,
			}
		}

		if invID.Valid {
			vd.Invoice = &models.Invoice{
				ID:          invID.String,
				ViolationID: invViolationID.String,
				Amount:      invAmount.Float64,
				Status:      invStatus.String,
				CreatedAt:   invCreatedAt.Time,
				UpdatedAt:   invUpdatedAt.Time,
			}
			if invUserID.Valid {
				vd.Invoice.UserID = &invUserID.String
			}
		}

		if paymentStatus.Valid {
			vd.PaymentStatus = &paymentStatus.String
		}
		if transactionID.Valid {
			vd.TransactionID = &transactionID.String
		}

		violations = append(violations, vd)
	}
	if err := rows.Err(); err != nil {
		log.Printf("rows iteration error: %v", err)
		writeError(w, http.StatusInternalServerError, "violation iteration error")
		return
	}

	writeJSON(w, http.StatusOK, violations)
}

func (h *Handler) GetViolation(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var v models.Violation
	var fcID, fcViolationID, fcRuleVersionID sql.NullString
	var fcBaseAmount, fcTimeMult, fcRepeatMult, fcTotalFine sql.NullFloat64
	var fcCalculatedAt sql.NullTime
	var invID, invViolationID, invUserID, invStatus sql.NullString
	var invAmount sql.NullFloat64
	var invCreatedAt, invUpdatedAt sql.NullTime
	var paymentStatus, transactionID sql.NullString

	err := h.DB.QueryRow(`
		SELECT v.id, v.plate, v.violation_type, v.location, v.violation_timestamp,
			v.photo_url, v.status, v.submitted_by, v.created_at, v.updated_at,
			fc.id, fc.violation_id, fc.rule_version_id, fc.base_amount, fc.time_multiplier,
			fc.repeat_multiplier, fc.total_fine, fc.calculated_at,
			i.id, i.violation_id, i.user_id, i.amount, i.status, i.created_at, i.updated_at,
			pt.status, pt.transaction_id
		FROM violations.violations v
		LEFT JOIN violations.fine_calculations fc ON fc.violation_id = v.id
		LEFT JOIN violations.invoices i ON i.violation_id = v.id
		LEFT JOIN LATERAL (
			SELECT pt.status, pt.transaction_id
			FROM payments.transactions pt
			WHERE pt.invoice_id = i.id
			ORDER BY pt.created_at DESC
			LIMIT 1
		) pt ON true
		WHERE v.id = $1
	`, id).Scan(
		&v.ID, &v.Plate, &v.ViolationType, &v.Location, &v.ViolationTimestamp,
		&v.PhotoURL, &v.Status, &v.SubmittedBy, &v.CreatedAt, &v.UpdatedAt,
		&fcID, &fcViolationID, &fcRuleVersionID, &fcBaseAmount, &fcTimeMult,
		&fcRepeatMult, &fcTotalFine, &fcCalculatedAt,
		&invID, &invViolationID, &invUserID, &invAmount, &invStatus, &invCreatedAt, &invUpdatedAt,
		&paymentStatus, &transactionID,
	)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "violation not found")
		return
	}
	if err != nil {
		log.Printf("get violation query error: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to query violation")
		return
	}

	vd := models.ViolationWithDetails{Violation: v}

	if fcID.Valid {
		vd.FineCalculation = &models.FineCalculation{
			ID:               fcID.String,
			ViolationID:      fcViolationID.String,
			RuleVersionID:    fcRuleVersionID.String,
			BaseAmount:       fcBaseAmount.Float64,
			TimeMultiplier:   fcTimeMult.Float64,
			RepeatMultiplier: fcRepeatMult.Float64,
			TotalFine:        fcTotalFine.Float64,
			CalculatedAt:     fcCalculatedAt.Time,
		}
	}

	if invID.Valid {
		vd.Invoice = &models.Invoice{
			ID:          invID.String,
			ViolationID: invViolationID.String,
			Amount:      invAmount.Float64,
			Status:      invStatus.String,
			CreatedAt:   invCreatedAt.Time,
			UpdatedAt:   invUpdatedAt.Time,
		}
		if invUserID.Valid {
			vd.Invoice.UserID = &invUserID.String
		}
	}

	if paymentStatus.Valid {
		vd.PaymentStatus = &paymentStatus.String
	}
	if transactionID.Valid {
		vd.TransactionID = &transactionID.String
	}

	writeJSON(w, http.StatusOK, vd)
}
