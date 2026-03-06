-- Payment enums
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELLED');
CREATE TYPE "PaymentMethodStatus" AS ENUM ('NONE', 'SAVED');

-- Payment fields on users table
ALTER TABLE "users"
  ADD COLUMN "stripe_customer_id"         TEXT UNIQUE,
  ADD COLUMN "stripe_subscription_id"     TEXT UNIQUE,
  ADD COLUMN "stripe_payment_method_id"   TEXT,
  ADD COLUMN "payment_method_status"      "PaymentMethodStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "card_last4"                 TEXT,
  ADD COLUMN "card_brand"                 TEXT,
  ADD COLUMN "card_expiry"                TEXT,
  ADD COLUMN "subscription_status"        "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "subscription_property_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "subscription_monthly_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "current_period_end"         TIMESTAMPTZ;
