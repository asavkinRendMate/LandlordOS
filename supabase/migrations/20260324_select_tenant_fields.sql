-- Add rejectionSentAt to screening_invites
ALTER TABLE screening_invites ADD COLUMN IF NOT EXISTS rejection_sent_at TIMESTAMPTZ;

-- Add onboardingState (JSON) to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_state JSONB;
