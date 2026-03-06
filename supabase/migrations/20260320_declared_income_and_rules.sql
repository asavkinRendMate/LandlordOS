-- Add declared income field to financial reports
ALTER TABLE financial_reports
  ADD COLUMN IF NOT EXISTS declared_income_pence INT;

-- Add income discrepancy scoring rules
INSERT INTO scoring_rules (id, category, key, description, points, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'AFFORDABILITY', 'INCOME_SLIGHT_DISCREPANCY', 'Declared income is 10-30% higher than evidenced income', -10, true, now(), now()),
  (gen_random_uuid(), 'AFFORDABILITY', 'INCOME_SIGNIFICANT_DISCREPANCY', 'Declared income is 30-50% higher than evidenced income', -25, true, now(), now()),
  (gen_random_uuid(), 'AFFORDABILITY', 'INCOME_MAJOR_DISCREPANCY', 'Declared income is more than double evidenced income', -40, true, now(), now())
ON CONFLICT (key) DO UPDATE SET points = EXCLUDED.points, description = EXCLUDED.description;
