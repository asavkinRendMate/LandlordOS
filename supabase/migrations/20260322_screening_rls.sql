-- RLS policies for screening_invites, screening_packages, screening_package_usages

-- ─── screening_invites ───────────────────────────────────────────────────────
ALTER TABLE screening_invites ENABLE ROW LEVEL SECURITY;

-- Landlord full access to own invites
CREATE POLICY "screening_invites: landlord full access"
  ON screening_invites FOR ALL
  USING (landlord_id = auth.uid()::text)
  WITH CHECK (landlord_id = auth.uid()::text);

-- ─── screening_packages ─────────────────────────────────────────────────────
ALTER TABLE screening_packages ENABLE ROW LEVEL SECURITY;

-- Owner full access to own packages
CREATE POLICY "screening_packages: owner full access"
  ON screening_packages FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ─── screening_package_usages ───────────────────────────────────────────────
ALTER TABLE screening_package_usages ENABLE ROW LEVEL SECURITY;

-- Owner access via package ownership
CREATE POLICY "screening_package_usages: owner full access"
  ON screening_package_usages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM screening_packages
      WHERE screening_packages.id = screening_package_usages.package_id
        AND screening_packages.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM screening_packages
      WHERE screening_packages.id = screening_package_usages.package_id
        AND screening_packages.user_id = auth.uid()::text
    )
  );
