-- Add category and respond_by fields to maintenance_requests for Awaab's Law support.
-- category: optional, e.g. 'DAMP_MOULD' triggers 24h response timer.
-- respond_by: auto-set deadline for damp/mould complaints.

ALTER TABLE maintenance_requests ADD COLUMN category TEXT;
ALTER TABLE maintenance_requests ADD COLUMN respond_by TIMESTAMPTZ;

CREATE INDEX idx_maintenance_respond_by
  ON maintenance_requests(respond_by)
  WHERE respond_by IS NOT NULL AND status != 'RESOLVED';
