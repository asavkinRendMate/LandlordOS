-- Add TenantStatus enum
CREATE TYPE "TenantStatus" AS ENUM ('CANDIDATE', 'INVITED', 'TENANT', 'FORMER_TENANT');

-- Add Tenant model
CREATE TABLE "tenants" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id"     TEXT,
  "property_id" TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "phone"       TEXT,
  "status"      "TenantStatus" NOT NULL DEFAULT 'INVITED',
  "invite_token" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "confirmed_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenants_invite_token_key" UNIQUE ("invite_token"),
  CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "tenants_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE
);

-- Auto-update updated_at
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
