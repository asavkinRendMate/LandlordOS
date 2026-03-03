-- ── Row Level Security ────────────────────────────────────────────────────────
--
-- Security model:
--   • Landlords authenticate via Supabase Auth (JWT). auth.uid() returns their UUID.
--   • users.id / properties.user_id are stored as TEXT for Prisma compat, so we
--     cast auth.uid()::text in every policy.
--   • Tenants have NO Supabase Auth account. They access the system via a
--     portal_token (opaque token on the tenancy row). Tenant-facing API routes
--     validate the token server-side and use the Supabase service role client to
--     fetch data, bypassing RLS intentionally and safely.
--   • Prisma connects via the pooled (pgbouncer) DATABASE_URL as the postgres
--     role, which bypasses RLS. RLS here is defence-in-depth: it protects against
--     direct DB access (Studio, psql, Supabase JS client) and accidental policy
--     drift in future client-side code.

-- ── Enable RLS ────────────────────────────────────────────────────────────────

ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist        ENABLE ROW LEVEL SECURITY;

-- ── users ─────────────────────────────────────────────────────────────────────
-- Each landlord can only read and update their own profile row.
-- INSERT is intentionally omitted: the handle_new_user SECURITY DEFINER trigger
-- (and Prisma's server-side upsert) handle creation without needing a policy.

CREATE POLICY "users: own row only"
  ON users
  FOR ALL
  USING     (id = auth.uid()::text)
  WITH CHECK(id = auth.uid()::text);

-- ── properties ────────────────────────────────────────────────────────────────
-- Landlords can SELECT, INSERT, UPDATE, and DELETE only their own properties.

CREATE POLICY "properties: owner full access"
  ON properties
  FOR ALL
  USING     (user_id = auth.uid()::text)
  WITH CHECK(user_id = auth.uid()::text);

-- ── tenancies ─────────────────────────────────────────────────────────────────
-- Landlords can fully manage tenancies that belong to their properties.
-- (Tenant portal access is via service role — see note at top of file.)

CREATE POLICY "tenancies: property owner full access"
  ON tenancies
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

-- ── compliance_docs ───────────────────────────────────────────────────────────
-- Landlords can fully manage compliance docs for their properties.
-- Tenants cannot access compliance_docs directly via RLS; instead, tenant-facing
-- API routes use the service role client, so they bypass this policy deliberately.

CREATE POLICY "compliance_docs: property owner full access"
  ON compliance_docs
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

-- ── waitlist ──────────────────────────────────────────────────────────────────
-- Anyone (anonymous or authenticated) may sign up — INSERT only.
-- No SELECT policy is created, so public users cannot read the list.
-- The service role (used by server-side admin code) bypasses RLS to query entries.

CREATE POLICY "waitlist: public insert"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
