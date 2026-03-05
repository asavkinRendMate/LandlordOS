CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "maintenance_requests" (
  "id"          TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "tenant_id"   TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority"    "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
  "status"      "MaintenanceStatus"   NOT NULL DEFAULT 'OPEN',
  "resolved_at" TIMESTAMPTZ,
  "resolved_by" TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_requests_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE,
  CONSTRAINT "maintenance_requests_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX "maintenance_requests_property_id_idx" ON "maintenance_requests"("property_id");
CREATE INDEX "maintenance_requests_tenant_id_idx"   ON "maintenance_requests"("tenant_id");
CREATE INDEX "maintenance_requests_status_idx"      ON "maintenance_requests"("status");
