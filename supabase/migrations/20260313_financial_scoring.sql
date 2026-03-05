-- Financial Scoring Engine
-- Adds ScoringRule, ScoringConfig, FinancialReport tables
-- and updates Property + Tenant with new fields/relations

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE "ScoringCategory" AS ENUM (
  'AFFORDABILITY', 'STABILITY', 'DEBT', 'GAMBLING', 'LIQUIDITY', 'POSITIVE'
);

CREATE TYPE "ReportType" AS ENUM (
  'LANDLORD_REQUESTED', 'SELF_REQUESTED'
);

CREATE TYPE "ReportStatus" AS ENUM (
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
);

-- ── ScoringRule ────────────────────────────────────────────────────────────────

CREATE TABLE scoring_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    "ScoringCategory" NOT NULL,
  key         TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  points      INT  NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ScoringConfig ──────────────────────────────────────────────────────────────

CREATE TABLE scoring_configs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version    INT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── FinancialReport ────────────────────────────────────────────────────────────

CREATE TABLE financial_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             TEXT REFERENCES tenants(id),
  property_id           TEXT REFERENCES properties(id),
  report_type           "ReportType" NOT NULL,
  status                "ReportStatus" NOT NULL DEFAULT 'PENDING',
  scoring_config_version INT NOT NULL,
  total_score           INT,
  grade                 TEXT,
  ai_summary            TEXT,
  breakdown             JSONB,
  applied_rules         JSONB,
  verification_token    UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  pdf_url               TEXT,
  statement_file_url    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Property: add requireFinancialVerification ──────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS require_financial_verification BOOLEAN NOT NULL DEFAULT FALSE;

-- ── updated_at triggers ────────────────────────────────────────────────────────
-- Note: update_updated_at_column() may already exist from a prior migration; CREATE OR REPLACE handles that.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_scoring_rules_updated_at ON scoring_rules;
CREATE TRIGGER update_scoring_rules_updated_at
  BEFORE UPDATE ON scoring_rules
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_reports_updated_at ON financial_reports;
CREATE TRIGGER update_financial_reports_updated_at
  BEFORE UPDATE ON financial_reports
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
