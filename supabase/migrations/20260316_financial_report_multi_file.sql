-- Multi-file upload, name verification & joint tenancy support for financial reports

-- Add new columns
ALTER TABLE financial_reports
  ADD COLUMN statement_files JSONB,
  ADD COLUMN applicant_name TEXT,
  ADD COLUMN joint_applicants JSONB,
  ADD COLUMN has_unverified_files BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN verification_warning TEXT;

-- Migrate existing statement_file_url data into statement_files array format
UPDATE financial_reports
SET statement_files = jsonb_build_array(
  jsonb_build_object(
    'index', 0,
    'fileName', split_part(statement_file_url, '/', 2),
    'storagePath', statement_file_url,
    'fileSize', 0,
    'verificationStatus', 'UNCERTAIN'
  )
)
WHERE statement_file_url IS NOT NULL;

-- Drop the old column
ALTER TABLE financial_reports DROP COLUMN statement_file_url;
