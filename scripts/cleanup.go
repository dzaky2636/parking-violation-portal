package main

import (
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dbURL := os.Getenv("SUPABASE_DATABASE_URL")
	if dbURL == "" {
		dbURL = os.Getenv("DATABASE_URL")
	}
	if dbURL == "" {
		log.Fatal("SUPABASE_DATABASE_URL or DATABASE_URL must be set")
	}

	config, err := pgx.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("parse config: %v", err)
	}
	config.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	db := stdlib.OpenDB(*config)
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("ping: %v", err)
	}

	// Delete test violations (cascades to fine_calculations, invoices, and transactions)
	result, err := db.Exec(`DELETE FROM violations.violations WHERE plate IN ('B 8888 AB', 'B 9999 ZZ')`)
	if err != nil {
		log.Fatalf("delete test violations: %v", err)
	}
	n, _ := result.RowsAffected()
	fmt.Printf("Deleted %d test violation(s)\n", n)

	// Delete test rules v2 and v3 (cascades to fine_rule_details)
	result, err = db.Exec(`DELETE FROM rules.fine_rules WHERE version > 1`)
	if err != nil {
		log.Fatalf("delete test rules: %v", err)
	}
	n, _ = result.RowsAffected()
	fmt.Printf("Deleted %d test rule(s)\n", n)

	// Restore v1 as active
	_, err = db.Exec(`UPDATE rules.fine_rules SET status = 'active' WHERE version = 1`)
	if err != nil {
		log.Fatalf("restore v1 active: %v", err)
	}
	fmt.Println("Rule v1 restored as active")

	fmt.Println("\nDatabase cleaned. Ready for fresh testing.")
}
