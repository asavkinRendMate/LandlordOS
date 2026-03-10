-- Updated: 2026-03-10 — Change default for require_financial_verification to true
-- New properties will default to requiring financial verification from applicants
ALTER TABLE properties ALTER COLUMN require_financial_verification SET DEFAULT true;
