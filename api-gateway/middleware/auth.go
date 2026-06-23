package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
)

type UserInfo struct {
	ID   string `json:"id"`
	Role string `json:"role"`
}

func Auth(db *sql.DB, supabaseURL, anonKey string) func(http.Handler) http.Handler {
	client := &http.Client{}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				writeAuthError(w, "missing or invalid authorization header")
				return
			}
			token := strings.TrimPrefix(authHeader, "Bearer ")

			req, err := http.NewRequestWithContext(context.Background(), "GET", supabaseURL+"/auth/v1/user", nil)
			if err != nil {
				log.Printf("create auth request: %v", err)
				writeAuthError(w, "auth service error")
				return
			}
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("apikey", anonKey)

			resp, err := client.Do(req)
			if err != nil {
				log.Printf("auth request failed: %v", err)
				writeAuthError(w, "auth service unavailable")
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				writeAuthError(w, "invalid or expired token")
				return
			}

			var supabaseUser struct {
				ID    string `json:"id"`
				Email string `json:"email"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&supabaseUser); err != nil {
				log.Printf("decode supabase user: %v", err)
				writeAuthError(w, "failed to parse user info")
				return
			}

			var role string
			err = db.QueryRow("SELECT role FROM public.profiles WHERE user_id = $1", supabaseUser.ID).Scan(&role)
			if err != nil {
				log.Printf("profile lookup for %s: %v", supabaseUser.ID, err)
				writeAuthError(w, "user profile not found")
				return
			}

			r.Header.Set("X-User-ID", supabaseUser.ID)
			r.Header.Set("X-User-Role", role)

			next.ServeHTTP(w, r)
		})
	}
}

func writeAuthError(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func RoleGate(allowedRoles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool)
	for _, role := range allowedRoles {
		allowed[role] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := r.Header.Get("X-User-Role")
			if !allowed[role] {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("role '%s' not permitted", role)})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
