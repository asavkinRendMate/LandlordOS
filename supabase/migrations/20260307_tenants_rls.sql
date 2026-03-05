-- ── Row Level Security for tenants ───────────────────────────────────────────
--
-- Two principals can access this table:
--
--   1. Landlords — full CRUD on tenants whose property_id belongs to them.
--
--   2. Confirmed tenants — once a tenant clicks their magic link and signs in,
--      their Supabase Auth UID is stored in tenants.user_id. They may SELECT
--      (and UPDATE name/phone) their own row only. They cannot touch other rows
--      or change property_id / status / invite_token.
--
--   Public / anonymous access: none. The join and apply flows use the Supabase
--   service role client server-side, bypassing RLS intentionally and safely.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ── Policy 1: landlord full access ────────────────────────────────────────────

CREATE POLICY "tenants: property owner full access"
  ON tenants
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

-- ── Policy 2: tenant read/update own row ──────────────────────────────────────

CREATE POLICY "tenants: own row read"
  ON tenants
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "tenants: own row update"
  ON tenants
  FOR UPDATE
  USING     (user_id = auth.uid()::text)
  WITH CHECK(user_id = auth.uid()::text);
