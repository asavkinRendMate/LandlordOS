-- Screening Invites: landlord sends invite → candidate uploads statements → report generated → landlord pays to unlock

CREATE TYPE "ScreeningInviteStatus" AS ENUM ('PENDING', 'STARTED', 'COMPLETED', 'PAID', 'EXPIRED');

CREATE TABLE screening_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  property_address TEXT NOT NULL,
  monthly_rent_pence INT NOT NULL,
  status "ScreeningInviteStatus" NOT NULL DEFAULT 'PENDING',
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE financial_reports
  ADD COLUMN IF NOT EXISTS invite_id UUID REFERENCES screening_invites(id),
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS monthly_rent_pence INT;

CREATE INDEX idx_screening_invites_token ON screening_invites(token);
CREATE INDEX idx_screening_invites_landlord ON screening_invites(landlord_id, created_at DESC);
