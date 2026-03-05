-- Maintenance Photos + Status History
-- Adds in_progress_at to maintenance_requests,
-- creates maintenance_status_history and maintenance_photos tables.

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS in_progress_at TIMESTAMPTZ;

CREATE TABLE maintenance_status_history (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id  TEXT NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  from_status "MaintenanceStatus",
  to_status   "MaintenanceStatus" NOT NULL,
  changed_by  TEXT NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note        TEXT
);

CREATE TABLE maintenance_photos (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id   TEXT NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  uploaded_by  TEXT NOT NULL,
  role         TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    INT  NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  caption      TEXT
);
