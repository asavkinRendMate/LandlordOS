-- Application invites: tracks emails sent via "Invite applicants" on the property page.
-- Persisted so invites survive page reload.

CREATE TABLE application_invites (
  id          TEXT        PRIMARY KEY,
  property_id TEXT        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, email)
);

CREATE INDEX idx_application_invites_property_id ON application_invites(property_id);

-- RLS
ALTER TABLE application_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlord can SELECT own property invites"
  ON application_invites FOR SELECT
  USING (property_id IN (SELECT id FROM properties WHERE user_id = auth.uid()));

CREATE POLICY "Landlord can INSERT own property invites"
  ON application_invites FOR INSERT
  WITH CHECK (property_id IN (SELECT id FROM properties WHERE user_id = auth.uid()));

CREATE POLICY "Landlord can DELETE own property invites"
  ON application_invites FOR DELETE
  USING (property_id IN (SELECT id FROM properties WHERE user_id = auth.uid()));
