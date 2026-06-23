-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "payments";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rules";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "violations";

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "member_plates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plate" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_plates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations"."violations" (
    "id" UUID NOT NULL,
    "plate" VARCHAR(20) NOT NULL,
    "violation_type" VARCHAR(50) NOT NULL,
    "location" VARCHAR(500) NOT NULL,
    "violation_timestamp" TIMESTAMPTZ NOT NULL,
    "photo_url" VARCHAR(1000) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "submitted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations"."fine_calculations" (
    "id" UUID NOT NULL,
    "violation_id" UUID NOT NULL,
    "rule_version_id" UUID NOT NULL,
    "base_amount" DECIMAL(15,2) NOT NULL,
    "time_multiplier" DECIMAL(5,2) NOT NULL,
    "repeat_multiplier" DECIMAL(5,2) NOT NULL,
    "total_fine" DECIMAL(15,2) NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fine_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations"."invoices" (
    "id" UUID NOT NULL,
    "violation_id" UUID NOT NULL,
    "user_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules"."fine_rules" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_by" UUID,
    "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fine_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules"."fine_rule_details" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "violation_type" VARCHAR(50) NOT NULL,
    "base_amount" DECIMAL(15,2) NOT NULL,
    "time_multiplier_start" TIME NOT NULL,
    "time_multiplier_end" TIME NOT NULL,
    "time_multiplier_value" DECIMAL(5,2) NOT NULL,
    "repeat_count_min" INTEGER NOT NULL DEFAULT 0,
    "repeat_multiplier" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "fine_rule_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."transactions" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "transaction_id" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "scenario" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_plates_plate_key" ON "member_plates"("plate");

-- CreateIndex
CREATE INDEX "member_plates_user_id_idx" ON "member_plates"("user_id");

-- CreateIndex
CREATE INDEX "violations_plate_violation_timestamp_idx" ON "violations"."violations"("plate", "violation_timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "fine_rules_version_key" ON "rules"."fine_rules"("version");

-- AddForeignKey
ALTER TABLE "violations"."fine_calculations" ADD CONSTRAINT "fine_calculations_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "violations"."violations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations"."invoices" ADD CONSTRAINT "invoices_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "violations"."violations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules"."fine_rule_details" ADD CONSTRAINT "fine_rule_details_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rules"."fine_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."transactions" ADD CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "violations"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
