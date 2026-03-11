-- Migration: Periodic Inspections
-- Updated: 2026-03-11 — RLS always required for new tables

-- 1. Create InspectionType enum
CREATE TYPE "InspectionType" AS ENUM ('MOVE_IN', 'PERIODIC', 'MOVE_OUT');

-- 2. Add new columns to property_inspections
ALTER TABLE "property_inspections"
  ADD COLUMN "inspection_type" "InspectionType" NOT NULL DEFAULT 'MOVE_IN',
  ADD COLUMN "inspection_number" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "scheduled_date" TIMESTAMPTZ,
  ADD COLUMN "notice_seen_at" TIMESTAMPTZ,
  ADD COLUMN "notice_token" TEXT;

-- Unique index on notice_token (sparse — only set for periodic inspections)
CREATE UNIQUE INDEX "property_inspections_notice_token_key"
  ON "property_inspections" ("notice_token") WHERE "notice_token" IS NOT NULL;

-- 3. Composite index for filtering by property + type
CREATE INDEX "property_inspections_property_id_inspection_type_idx"
  ON "property_inspections" ("property_id", "inspection_type");

-- 4. Create inspection_schedules table
CREATE TABLE "inspection_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenancy_id" TEXT NOT NULL,
  "frequency_months" INTEGER NOT NULL,
  "next_due_date" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "inspection_schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inspection_schedules_tenancy_id_key" UNIQUE ("tenancy_id"),
  CONSTRAINT "inspection_schedules_tenancy_id_fkey"
    FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE
);

-- 5. Enable RLS on inspection_schedules
ALTER TABLE "inspection_schedules" ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — landlord can manage their own inspection schedules
CREATE POLICY "inspection_schedules_select"
  ON "inspection_schedules" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "tenancies" t
      JOIN "properties" p ON p.id = t."property_id"
      WHERE t.id = "inspection_schedules"."tenancy_id"
        AND p."user_id" = auth.uid()::text
    )
  );

CREATE POLICY "inspection_schedules_insert"
  ON "inspection_schedules" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "tenancies" t
      JOIN "properties" p ON p.id = t."property_id"
      WHERE t.id = "inspection_schedules"."tenancy_id"
        AND p."user_id" = auth.uid()::text
    )
  );

CREATE POLICY "inspection_schedules_update"
  ON "inspection_schedules" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "tenancies" t
      JOIN "properties" p ON p.id = t."property_id"
      WHERE t.id = "inspection_schedules"."tenancy_id"
        AND p."user_id" = auth.uid()::text
    )
  );

CREATE POLICY "inspection_schedules_delete"
  ON "inspection_schedules" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "tenancies" t
      JOIN "properties" p ON p.id = t."property_id"
      WHERE t.id = "inspection_schedules"."tenancy_id"
        AND p."user_id" = auth.uid()::text
    )
  );
