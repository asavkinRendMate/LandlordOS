-- Add missing database indexes from audit (11 Mar 2026)
-- Updated: 2026-03-11 — 7 indexes across 6 models

-- ComplianceDoc: cron scans by expiryDate
CREATE INDEX IF NOT EXISTS "compliance_docs_expiry_date_idx"
  ON "compliance_docs" ("expiry_date");

-- Tenancy: cron filters by status alone (compliance, rent reminders, scoring)
CREATE INDEX IF NOT EXISTS "tenancies_status_idx"
  ON "tenancies" ("status");

-- Tenancy: deposit protection cron (status + depositProtected)
CREATE INDEX IF NOT EXISTS "tenancies_status_deposit_protected_idx"
  ON "tenancies" ("status", "deposit_protected");

-- DocumentAcknowledgment: FK field used in cascade deleteMany by tenantId
CREATE INDEX IF NOT EXISTS "document_acknowledgments_tenant_id_idx"
  ON "document_acknowledgments" ("tenant_id");

-- MaintenanceRequest: Awaab's Law cron (status + respondBy range)
CREATE INDEX IF NOT EXISTS "maintenance_requests_status_respond_by_idx"
  ON "maintenance_requests" ("status", "respond_by");

-- FinancialReport: charge route queries by status without inviteId
CREATE INDEX IF NOT EXISTS "financial_reports_status_idx"
  ON "financial_reports" ("status");

-- ComplianceAlertLog: FK field for userId
CREATE INDEX IF NOT EXISTS "compliance_alert_log_user_id_idx"
  ON "compliance_alert_log" ("user_id");
