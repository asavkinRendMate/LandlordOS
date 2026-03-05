-- Refactor: link Tenancy to Tenant via FK instead of duplicating name/email/phone

-- 1. Add tenant_id column (nullable)
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL;

-- 2. Populate tenant_id for existing rows by matching property + email
UPDATE tenancies t
SET tenant_id = te.id
FROM tenants te
WHERE te.property_id = t.property_id
  AND te.email = t.tenant_email
  AND t.tenant_email IS NOT NULL
  AND t.tenant_id IS NULL;

-- 3. Drop the now-redundant columns
ALTER TABLE tenancies DROP COLUMN IF EXISTS tenant_name;
ALTER TABLE tenancies DROP COLUMN IF EXISTS tenant_email;
ALTER TABLE tenancies DROP COLUMN IF EXISTS tenant_phone;
