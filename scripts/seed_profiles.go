package main

import (
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = os.Getenv("SUPABASE_DATABASE_URL")
	}
	if dbURL == "" {
		log.Fatal("Set DATABASE_URL or SUPABASE_DATABASE_URL")
	}

	officerID := os.Getenv("OFFICER_ID")
	memberID := os.Getenv("MEMBER_ID")
	memberPlate := os.Getenv("MEMBER_PLATE")

	if officerID == "" || memberID == "" {
		fmt.Println("Usage: OFFICER_ID=<uuid> MEMBER_ID=<uuid> [MEMBER_PLATE='B 1234 XYZ'] go run seed_profiles.go")
		fmt.Println("Get UUIDs from Supabase Dashboard → Authentication → Users")
		os.Exit(1)
	}
	if memberPlate == "" {
		memberPlate = "B 1234 XYZ"
	}

	config, err := pgx.ParseConfig(dbURL)
	if err != nil {
		log.Fatal(err)
	}
	config.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	db := stdlib.OpenDB(*config)
	defer db.Close()

	_, err = db.Exec(`
		INSERT INTO public.profiles (user_id, role, full_name) VALUES ($1, 'officer', 'Test Officer')
		ON CONFLICT (user_id) DO UPDATE SET role = 'officer'
	`, officerID)
	if err != nil {
		log.Fatalf("insert officer: %v", err)
	}
	fmt.Printf("Officer profile: %s\n", officerID)

	_, err = db.Exec(`
		INSERT INTO public.profiles (user_id, role, full_name) VALUES ($1, 'member', 'Test Member')
		ON CONFLICT (user_id) DO UPDATE SET role = 'member'
	`, memberID)
	if err != nil {
		log.Fatalf("insert member: %v", err)
	}
	fmt.Printf("Member profile: %s\n", memberID)

	_, err = db.Exec(`
		INSERT INTO public.member_plates (id, user_id, plate) VALUES (gen_random_uuid()::uuid, $1, $2)
		ON CONFLICT DO NOTHING
	`, memberID, memberPlate)
	if err != nil {
		log.Fatalf("insert plate: %v", err)
	}
	fmt.Printf("Plate '%s' registered to member\n", memberPlate)

	fmt.Println("\nReady! Log in as officer@test.com and member@test.com at http://localhost:3000/login")
}
