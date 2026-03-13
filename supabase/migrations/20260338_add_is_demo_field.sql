-- Add isDemo flag to users table for ephemeral demo accounts
ALTER TABLE users ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;

-- Index for cleanup cron query
CREATE INDEX idx_users_is_demo_created_at ON users (is_demo, created_at) WHERE is_demo = true;
