-- ──────────────────────────────────────────────────────────────────────────────
-- Enable RLS on all remaining unrestricted tables
--
-- Tables: maintenance_requests, maintenance_photos, maintenance_status_history,
--         tenant_documents, financial_reports, scoring_configs, scoring_rules
--
-- Follows the same patterns established in:
--   20260305_enable_rls.sql        (users, properties, tenancies, compliance_docs, waitlist)
--   20260307_tenants_rls.sql       (tenants)
--   20260308_property_documents.sql (property_documents, document_acknowledgments)
--   20260309_rent_payments.sql     (rent_payments)
--
-- Key conventions:
--   • auth.uid()::text — cast because IDs are stored as TEXT for Prisma compat
--   • Landlord access routes through properties.user_id
--   • Tenant access routes through tenants.user_id
--   • Prisma uses the postgres role (bypasses RLS). RLS is defence-in-depth
--     for direct DB access (Studio, psql, Supabase JS client).
-- ──────────────────────────────────────────────────────────────────────────────


-- ── maintenance_requests ────────────────────────────────────────────────────

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Landlord: full access via property ownership
CREATE POLICY "maintenance_requests: landlord full access"
  ON maintenance_requests
  FOR ALL
  USING (
    property_id IN (
      SELECT id FROM properties WHERE user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE user_id = auth.uid()::text
    )
  );

-- Tenant: read own requests
CREATE POLICY "maintenance_requests: tenant select"
  ON maintenance_requests
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  );

-- Tenant: update own requests
CREATE POLICY "maintenance_requests: tenant update"
  ON maintenance_requests
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  );

-- Tenant: delete own requests
CREATE POLICY "maintenance_requests: tenant delete"
  ON maintenance_requests
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  );

-- Any authenticated user can create a request
CREATE POLICY "maintenance_requests: authenticated insert"
  ON maintenance_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ── maintenance_photos ──────────────────────────────────────────────────────

ALTER TABLE maintenance_photos ENABLE ROW LEVEL SECURITY;

-- Landlord: read photos via property ownership
CREATE POLICY "maintenance_photos: landlord select"
  ON maintenance_photos
  FOR SELECT
  USING (
    request_id IN (
      SELECT mr.id FROM maintenance_requests mr
      JOIN properties p ON p.id = mr.property_id
      WHERE p.user_id = auth.uid()::text
    )
  );

-- Tenant: read photos on own requests
CREATE POLICY "maintenance_photos: tenant select"
  ON maintenance_photos
  FOR SELECT
  USING (
    request_id IN (
      SELECT mr.id FROM maintenance_requests mr
      JOIN tenants t ON t.id = mr.tenant_id
      WHERE t.user_id = auth.uid()::text
    )
  );

-- Any authenticated user can upload photos
CREATE POLICY "maintenance_photos: authenticated insert"
  ON maintenance_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only the uploader can delete their own photos
CREATE POLICY "maintenance_photos: uploader delete"
  ON maintenance_photos
  FOR DELETE
  USING (uploaded_by = auth.uid()::text);


-- ── maintenance_status_history ──────────────────────────────────────────────
-- Immutable audit trail — no UPDATE or DELETE policies.

ALTER TABLE maintenance_status_history ENABLE ROW LEVEL SECURITY;

-- Landlord: read history via property ownership
CREATE POLICY "maintenance_status_history: landlord select"
  ON maintenance_status_history
  FOR SELECT
  USING (
    request_id IN (
      SELECT mr.id FROM maintenance_requests mr
      JOIN properties p ON p.id = mr.property_id
      WHERE p.user_id = auth.uid()::text
    )
  );

-- Tenant: read history on own requests
CREATE POLICY "maintenance_status_history: tenant select"
  ON maintenance_status_history
  FOR SELECT
  USING (
    request_id IN (
      SELECT mr.id FROM maintenance_requests mr
      JOIN tenants t ON t.id = mr.tenant_id
      WHERE t.user_id = auth.uid()::text
    )
  );

-- Any authenticated user can insert (record status changes)
CREATE POLICY "maintenance_status_history: authenticated insert"
  ON maintenance_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ── tenant_documents ────────────────────────────────────────────────────────

ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

-- Landlord: read via tenant → property chain
CREATE POLICY "tenant_documents: landlord select"
  ON tenant_documents
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN properties p ON p.id = t.property_id
      WHERE p.user_id = auth.uid()::text
    )
  );

-- Landlord: delete via tenant → property chain
CREATE POLICY "tenant_documents: landlord delete"
  ON tenant_documents
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN properties p ON p.id = t.property_id
      WHERE p.user_id = auth.uid()::text
    )
  );

-- Tenant: read own documents
CREATE POLICY "tenant_documents: tenant select"
  ON tenant_documents
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  );

-- Any authenticated user can upload
CREATE POLICY "tenant_documents: authenticated insert"
  ON tenant_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ── financial_reports ───────────────────────────────────────────────────────

ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Landlord: read reports via property ownership
CREATE POLICY "financial_reports: landlord select"
  ON financial_reports
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE user_id = auth.uid()::text
    )
  );

-- Landlord: update reports via property ownership
CREATE POLICY "financial_reports: landlord update"
  ON financial_reports
  FOR UPDATE
  USING (
    property_id IN (
      SELECT id FROM properties WHERE user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE user_id = auth.uid()::text
    )
  );

-- Tenant: read own reports
CREATE POLICY "financial_reports: tenant select"
  ON financial_reports
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  );

-- Tenant: update own reports
CREATE POLICY "financial_reports: tenant update"
  ON financial_reports
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  );

-- Any authenticated user can create a report
CREATE POLICY "financial_reports: authenticated insert"
  ON financial_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ── scoring_configs ─────────────────────────────────────────────────────────
-- Read-only config table. Managed via DB directly (no INSERT/UPDATE/DELETE).

ALTER TABLE scoring_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scoring_configs: authenticated select"
  ON scoring_configs
  FOR SELECT
  TO authenticated
  USING (true);


-- ── scoring_rules ───────────────────────────────────────────────────────────
-- Read-only config table. Managed via DB directly (no INSERT/UPDATE/DELETE).

ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scoring_rules: authenticated select"
  ON scoring_rules
  FOR SELECT
  TO authenticated
  USING (true);
