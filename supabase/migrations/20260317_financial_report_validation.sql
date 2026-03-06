-- Add validation_results and failure_reason columns to financial_reports
ALTER TABLE financial_reports
  ADD COLUMN IF NOT EXISTS validation_results JSONB,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;
