-- Screening debug logs — persisted per financial report
CREATE TABLE screening_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  screening_report_id TEXT NOT NULL REFERENCES financial_reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB
);

CREATE INDEX idx_screening_logs_report ON screening_logs(screening_report_id);

-- RLS
ALTER TABLE screening_logs ENABLE ROW LEVEL SECURITY;

-- Only the service role (server-side engine) writes logs.
-- Landlord can read logs for their own reports (via property ownership).
CREATE POLICY "Landlord can read screening logs for own reports"
  ON screening_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM financial_reports fr
      JOIN properties p ON fr.property_id = p.id
      WHERE fr.id = screening_logs.screening_report_id
        AND p.user_id = auth.uid()
    )
  );

-- Service role bypasses RLS, so no INSERT policy needed for the engine.
-- But add one scoped to service role for safety documentation.
CREATE POLICY "Service role can insert screening logs"
  ON screening_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can delete screening logs"
  ON screening_logs FOR DELETE
  USING (true);
