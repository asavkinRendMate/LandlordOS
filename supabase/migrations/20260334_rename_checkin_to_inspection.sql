-- ──────────────────────────────────────────────────────────────────────────────
-- Rename CheckInReport → PropertyInspection, CheckInPhoto → InspectionPhoto
--
-- Pure rename — zero logic changes.
-- Storage bucket "check-in-photos" is NOT renamed (external resource).
-- Updated: 2026-03-11 — RLS always required for new tables
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Rename enum ──────────────────────────────────────────────────────────

ALTER TYPE "CheckInReportStatus" RENAME TO "InspectionStatus";

-- ── 2. Drop existing RLS policies (must reference old table names) ──────────

DROP POLICY IF EXISTS "check_in_reports: landlord full access" ON check_in_reports;
DROP POLICY IF EXISTS "check_in_reports: tenant select" ON check_in_reports;
DROP POLICY IF EXISTS "check_in_photos: landlord full access" ON check_in_photos;
DROP POLICY IF EXISTS "check_in_photos: tenant select" ON check_in_photos;

-- ── 3. Rename tables ────────────────────────────────────────────────────────

ALTER TABLE check_in_reports RENAME TO property_inspections;
ALTER TABLE check_in_photos RENAME TO inspection_photos;

-- ── 4. Rename column in inspection_photos ───────────────────────────────────

ALTER TABLE inspection_photos RENAME COLUMN "report_id" TO "inspection_id";

-- ── 5. Rename constraints ───────────────────────────────────────────────────

ALTER TABLE property_inspections RENAME CONSTRAINT "check_in_reports_pkey" TO "property_inspections_pkey";
ALTER TABLE property_inspections RENAME CONSTRAINT "check_in_reports_token_key" TO "property_inspections_token_key";
ALTER TABLE property_inspections RENAME CONSTRAINT "check_in_reports_property_id_fkey" TO "property_inspections_property_id_fkey";
ALTER TABLE property_inspections RENAME CONSTRAINT "check_in_reports_tenant_id_fkey" TO "property_inspections_tenant_id_fkey";

ALTER TABLE inspection_photos RENAME CONSTRAINT "check_in_photos_pkey" TO "inspection_photos_pkey";
ALTER TABLE inspection_photos RENAME CONSTRAINT "check_in_photos_report_id_fkey" TO "inspection_photos_inspection_id_fkey";
ALTER TABLE inspection_photos RENAME CONSTRAINT "check_in_photos_room_id_fkey" TO "inspection_photos_room_id_fkey";

-- ── 6. Rename indexes ───────────────────────────────────────────────────────

ALTER INDEX IF EXISTS "check_in_reports_property_id_idx" RENAME TO "property_inspections_property_id_idx";
ALTER INDEX IF EXISTS "check_in_reports_tenant_id_idx" RENAME TO "property_inspections_tenant_id_idx";
ALTER INDEX IF EXISTS "check_in_photos_report_id_idx" RENAME TO "inspection_photos_inspection_id_idx";
ALTER INDEX IF EXISTS "check_in_photos_room_id_idx" RENAME TO "inspection_photos_room_id_idx";

-- ── 7. Recreate RLS policies with new table names ───────────────────────────

-- property_inspections already has RLS enabled (carried over from rename)

CREATE POLICY "property_inspections: landlord full access"
  ON property_inspections
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

CREATE POLICY "property_inspections: tenant select"
  ON property_inspections
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()::text
    )
  );

-- inspection_photos already has RLS enabled (carried over from rename)

CREATE POLICY "inspection_photos: landlord full access"
  ON inspection_photos
  FOR ALL
  USING (
    inspection_id IN (
      SELECT pi.id FROM property_inspections pi
      JOIN properties p ON p.id = pi.property_id
      WHERE p.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    inspection_id IN (
      SELECT pi.id FROM property_inspections pi
      JOIN properties p ON p.id = pi.property_id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "inspection_photos: tenant select"
  ON inspection_photos
  FOR SELECT
  USING (
    inspection_id IN (
      SELECT pi.id FROM property_inspections pi
      JOIN tenants t ON t.id = pi.tenant_id
      WHERE t.user_id = auth.uid()::text
    )
  );
