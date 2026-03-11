-- Stripe Phase 2: Payments table + property screening cycle tracking
-- Updated: 2026-03-11 — RLS always required for new tables

-- ── payments table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_pence            INT NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'gbp',
  reason                  TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT UNIQUE,
  reference_id            TEXT,
  metadata                JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Landlords can read their own payments
CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid()::text);

-- Only service role inserts/updates (API routes use service role client)
CREATE POLICY "Service role full access on payments"
  ON payments FOR ALL
  USING (auth.role() = 'service_role');

-- ── screening_cycle_reset_at on properties ──────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS screening_cycle_reset_at TIMESTAMPTZ;

-- Backfill: set to created_at for existing properties
UPDATE properties
  SET screening_cycle_reset_at = created_at
  WHERE screening_cycle_reset_at IS NULL;
