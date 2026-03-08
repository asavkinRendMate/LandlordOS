-- Performance indexes for all FK fields and common query patterns
-- Based on audit of 187 Prisma queries across the codebase

-- Property: userId is used in ~20 queries (findMany, findFirst, count)
CREATE INDEX IF NOT EXISTS "properties_user_id_idx" ON "properties" ("user_id");

-- Tenancy: FK fields + composite for status-filtered lookups
CREATE INDEX IF NOT EXISTS "tenancies_property_id_idx" ON "tenancies" ("property_id");
CREATE INDEX IF NOT EXISTS "tenancies_tenant_id_idx" ON "tenancies" ("tenant_id");
CREATE INDEX IF NOT EXISTS "tenancies_property_id_status_idx" ON "tenancies" ("property_id", "status");

-- RentPayment: FK + date-range lookups + status batch updates
CREATE INDEX IF NOT EXISTS "rent_payments_tenancy_id_idx" ON "rent_payments" ("tenancy_id");
CREATE INDEX IF NOT EXISTS "rent_payments_tenancy_id_due_date_idx" ON "rent_payments" ("tenancy_id", "due_date");
CREATE INDEX IF NOT EXISTS "rent_payments_status_due_date_idx" ON "rent_payments" ("status", "due_date");

-- Tenant: FK fields + composite for email+status queries (tenant portal auth)
CREATE INDEX IF NOT EXISTS "tenants_property_id_idx" ON "tenants" ("property_id");
CREATE INDEX IF NOT EXISTS "tenants_user_id_idx" ON "tenants" ("user_id");
CREATE INDEX IF NOT EXISTS "tenants_email_status_idx" ON "tenants" ("email", "status");

-- TenantDocument: FK for tenant doc listing
CREATE INDEX IF NOT EXISTS "tenant_documents_tenant_id_idx" ON "tenant_documents" ("tenant_id");

-- PropertyDocument: FK for property doc listing
CREATE INDEX IF NOT EXISTS "property_documents_property_id_idx" ON "property_documents" ("property_id");

-- MaintenanceRequest: FK fields + composite for status-filtered dashboard queries
CREATE INDEX IF NOT EXISTS "maintenance_requests_property_id_idx" ON "maintenance_requests" ("property_id");
CREATE INDEX IF NOT EXISTS "maintenance_requests_tenant_id_idx" ON "maintenance_requests" ("tenant_id");
CREATE INDEX IF NOT EXISTS "maintenance_requests_property_id_status_idx" ON "maintenance_requests" ("property_id", "status");

-- MaintenanceStatusHistory: FK for audit trail ordering
CREATE INDEX IF NOT EXISTS "maintenance_status_history_request_id_idx" ON "maintenance_status_history" ("request_id");

-- MaintenancePhoto: FK for photo listing per request
CREATE INDEX IF NOT EXISTS "maintenance_photos_request_id_idx" ON "maintenance_photos" ("request_id");

-- FinancialReport: FK fields + composite for invite+status lookups
CREATE INDEX IF NOT EXISTS "financial_reports_tenant_id_idx" ON "financial_reports" ("tenant_id");
CREATE INDEX IF NOT EXISTS "financial_reports_property_id_idx" ON "financial_reports" ("property_id");
CREATE INDEX IF NOT EXISTS "financial_reports_invite_id_idx" ON "financial_reports" ("invite_id");
CREATE INDEX IF NOT EXISTS "financial_reports_invite_id_status_idx" ON "financial_reports" ("invite_id", "status");

-- ScreeningInvite: FK + composite for landlord dashboard queries
CREATE INDEX IF NOT EXISTS "screening_invites_landlord_id_idx" ON "screening_invites" ("landlord_id");
CREATE INDEX IF NOT EXISTS "screening_invites_landlord_id_status_idx" ON "screening_invites" ("landlord_id", "status");

-- ScreeningPackage: FK + composite for credit balance queries
CREATE INDEX IF NOT EXISTS "screening_packages_user_id_idx" ON "screening_packages" ("user_id");
CREATE INDEX IF NOT EXISTS "screening_packages_user_id_payment_status_idx" ON "screening_packages" ("user_id", "payment_status");

-- ScreeningPackageUsage: FK for usage history listing
CREATE INDEX IF NOT EXISTS "screening_package_usages_package_id_idx" ON "screening_package_usages" ("package_id");

-- PropertyRoom: FK for room listing per property
CREATE INDEX IF NOT EXISTS "property_rooms_property_id_idx" ON "property_rooms" ("property_id");

-- CheckInReport: FK fields for property/tenant lookups
CREATE INDEX IF NOT EXISTS "check_in_reports_property_id_idx" ON "check_in_reports" ("property_id");
CREATE INDEX IF NOT EXISTS "check_in_reports_tenant_id_idx" ON "check_in_reports" ("tenant_id");

-- CheckInPhoto: FK fields for photo listing per report/room
CREATE INDEX IF NOT EXISTS "check_in_photos_report_id_idx" ON "check_in_photos" ("report_id");
CREATE INDEX IF NOT EXISTS "check_in_photos_room_id_idx" ON "check_in_photos" ("room_id");
