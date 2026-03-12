-- Migration: Add tenancy_contracts table for APT contract signing flow
-- Updated: 2026-03-12 — RLS always required for new tables

-- ── Enums ──────────────────────────────────────────────────────────────────────

CREATE TYPE "ContractStatus" AS ENUM (
  'PENDING_GENERATION',
  'PENDING_SIGNATURES',
  'LANDLORD_SIGNED',
  'TENANT_SIGNED',
  'BOTH_SIGNED',
  'VOIDED'
);

CREATE TYPE "ContractType" AS ENUM (
  'GENERATED',
  'UPLOADED'
);

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE "tenancy_contracts" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenancy_id"            TEXT NOT NULL,
  "type"                  "ContractType" NOT NULL,
  "status"                "ContractStatus" NOT NULL DEFAULT 'PENDING_GENERATION',
  "pdf_url"               TEXT,
  "landlord_token"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenant_token"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "landlord_signed_at"    TIMESTAMPTZ,
  "landlord_signed_name"  TEXT,
  "landlord_signed_ip"    TEXT,
  "tenant_signed_at"      TIMESTAMPTZ,
  "tenant_signed_name"    TEXT,
  "tenant_signed_ip"      TEXT,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "tenancy_contracts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenancy_contracts_tenancy_id_fkey"
    FOREIGN KEY ("tenancy_id") REFERENCES "tenancies"("id") ON DELETE CASCADE
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "tenancy_contracts_tenancy_id_key" ON "tenancy_contracts"("tenancy_id");
CREATE UNIQUE INDEX "tenancy_contracts_landlord_token_key" ON "tenancy_contracts"("landlord_token");
CREATE UNIQUE INDEX "tenancy_contracts_tenant_token_key" ON "tenancy_contracts"("tenant_token");
CREATE INDEX "tenancy_contracts_tenancy_id_idx" ON "tenancy_contracts"("tenancy_id");

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE "tenancy_contracts" ENABLE ROW LEVEL SECURITY;

-- Landlord can SELECT their own contracts
CREATE POLICY "tenancy_contracts_select_landlord" ON "tenancy_contracts"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "tenancies" t
      JOIN "properties" p ON p."id" = t."property_id"
      WHERE t."id" = "tenancy_contracts"."tenancy_id"
        AND p."user_id" = auth.uid()::text
    )
  );

-- Landlord can INSERT contracts for their properties
CREATE POLICY "tenancy_contracts_insert_landlord" ON "tenancy_contracts"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "tenancies" t
      JOIN "properties" p ON p."id" = t."property_id"
      WHERE t."id" = "tenancy_contracts"."tenancy_id"
        AND p."user_id" = auth.uid()::text
    )
  );

-- Landlord can UPDATE contracts for their properties
CREATE POLICY "tenancy_contracts_update_landlord" ON "tenancy_contracts"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "tenancies" t
      JOIN "properties" p ON p."id" = t."property_id"
      WHERE t."id" = "tenancy_contracts"."tenancy_id"
        AND p."user_id" = auth.uid()::text
    )
  );
