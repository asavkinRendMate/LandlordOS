-- Compliance alert deduplication log
-- Tracks which alerts have been sent to avoid duplicate emails.
-- Service role only — no user access needed.

CREATE TABLE compliance_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  notification_id TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_log_lookup
  ON compliance_alert_log(notification_id, reference_id, sent_at);

ALTER TABLE compliance_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON compliance_alert_log
  USING (false);
