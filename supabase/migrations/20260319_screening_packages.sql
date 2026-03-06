-- Screening packages for standalone tenant screening product
CREATE TYPE "ScreeningPackageType" AS ENUM ('SINGLE', 'TRIPLE', 'SIXER', 'TEN');
CREATE TYPE "ScreeningPaymentStatus" AS ENUM ('PENDING', 'MOCK_PAID', 'PAID', 'REFUNDED');

CREATE TABLE screening_packages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_type "ScreeningPackageType" NOT NULL,
  total_credits INT NOT NULL,
  used_credits INT NOT NULL DEFAULT 0,
  price_pence INT NOT NULL,
  payment_status "ScreeningPaymentStatus" NOT NULL DEFAULT 'PENDING',
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE screening_package_usages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  package_id TEXT NOT NULL REFERENCES screening_packages(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  monthly_rent_pence INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link financial reports to screening usages
ALTER TABLE financial_reports
  ADD COLUMN IF NOT EXISTS screening_usage_id TEXT UNIQUE REFERENCES screening_package_usages(id);
