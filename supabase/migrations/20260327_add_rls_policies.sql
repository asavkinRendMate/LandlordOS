-- ──────────────────────────────────────────────────────────────────────────────
-- Enable RLS on check_in_reports, check_in_photos, property_rooms
--
-- These three tables were created in 20260325_rooms_and_checkin.sql without
-- RLS policies. This migration closes that gap.
--
-- Key conventions (same as 20260305, 20260307, 20260315):
--   • auth.uid()::text — cast because IDs are stored as TEXT for Prisma compat
--   • Landlord access routes through properties.user_id
--   • Tenant access routes through tenants.user_id
--   • Prisma uses the postgres role (bypasses RLS). RLS is defence-in-depth.
-- ──────────────────────────────────────────────────────────────────────────────


-- ── check_in_reports ─────────────────────────────────────────────────────────

ALTER TABLE check_in_reports ENABLE ROW LEVEL SECURITY;

-- Landlord: full access via property ownership
CREATE POLICY "check_in_reports: landlord full access"
  ON check_in_reports
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

-- Tenant: read reports they are named on
CREATE POLICY "check_in_reports: tenant select"
  ON check_in_reports
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  );


-- ── check_in_photos ──────────────────────────────────────────────────────────

ALTER TABLE check_in_photos ENABLE ROW LEVEL SECURITY;

-- Landlord: full access via report → property ownership
CREATE POLICY "check_in_photos: landlord full access"
  ON check_in_photos
  FOR ALL
  USING (
    report_id IN (
      SELECT cr.id FROM check_in_reports cr
      JOIN properties p ON p.id = cr.property_id
      WHERE p.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    report_id IN (
      SELECT cr.id FROM check_in_reports cr
      JOIN properties p ON p.id = cr.property_id
      WHERE p.user_id = auth.uid()::text
    )
  );

-- Tenant: read photos on reports they are named on
CREATE POLICY "check_in_photos: tenant select"
  ON check_in_photos
  FOR SELECT
  USING (
    report_id IN (
      SELECT cr.id FROM check_in_reports cr
      JOIN tenants t ON t.id = cr.tenant_id
      WHERE t.user_id = auth.uid()::text
    )
  );


-- ── property_rooms ───────────────────────────────────────────────────────────

ALTER TABLE property_rooms ENABLE ROW LEVEL SECURITY;

-- Landlord: full access via property ownership
CREATE POLICY "property_rooms: landlord full access"
  ON property_rooms
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

-- Tenant: read rooms for properties they are a tenant on
CREATE POLICY "property_rooms: tenant select"
  ON property_rooms
  FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM tenants WHERE user_id = auth.uid()::text
    )
  );
