# CLAUDE.md — Project Instructions

**Before starting any task, also read: `CLAUDE.PATTERNS.md` and `CLAUDE.NEVERDO.md`**

## Project Overview

**LetSorted** (letsorted.co.uk) — UK property management SaaS for self-managing landlords (1–5 properties). Simple, practical tools: document management, tenant pipeline, rent tracking, compliance alerts, AI-powered financial screening. Renters' Rights Act 2025 compliance built in.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 5.22 |
| Auth | Supabase Auth (6-digit OTP — no passwords, no magic links) |
| Storage | Supabase Storage (5 private buckets) |
| Email | Resend (`lib/resend.ts`, console fallback in dev) |
| Payments | Stripe (Phase 1 complete — client, webhook, SetupIntent card flow) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Live Chat | Crisp (via `NEXT_PUBLIC_CRISP_WEBSITE_ID`) |
| Hosting | Vercel |
| Styling | Tailwind CSS + shadcn/ui (New York style) |
| Validation | Zod **v4** — use `error:` not `errorMap:` for custom messages |
| PDF | pdf-lib (compression, splitting) |

---

## Project Structure

```
app/
├── (admin)/
│   ├── admin/
│   │   ├── login/
│   │   ├── notifications/
│   │   ├── screenings/
│   │   └── page.tsx
│   └── layout.tsx
├── (auth)/
│   └── login/
│       └── page.tsx
├── (dashboard)/
│   ├── dashboard/
│   │   ├── maintenance/
│   │   ├── onboarding/
│   │   ├── properties/
│   │   ├── settings/
│   │   └── page.tsx
│   └── layout.tsx
├── (marketing)/
│   ├── cookies/
│   │   ├── manage-cookies-button.tsx
│   │   └── page.tsx
│   ├── features/
│   │   ├── issue-management/
│   │   ├── move-in/
│   │   ├── property-management/
│   │   ├── tenancy-renewal/
│   │   └── tenant-screening/
│   ├── guides/
│   │   ├── [slug]/
│   │   └── page.tsx
│   ├── privacy/
│   │   └── page.tsx
│   ├── renters-rights-act/
│   │   ├── crisp-link.tsx
│   │   └── page.tsx
│   ├── screening/
│   │   ├── apply/
│   │   ├── invites/
│   │   ├── packages/
│   │   ├── report/
│   │   ├── sent/
│   │   ├── use/
│   │   ├── client.tsx
│   │   └── page.tsx
│   ├── terms/
│   │   └── page.tsx
│   ├── verify/
│   │   └── [token]/
│   ├── layout.tsx
│   └── page.tsx
├── (tenant)/
│   ├── apply/
│   │   └── [propertyId]/
│   ├── inspection/
│   │   └── [token]/
│   ├── passport/
│   │   └── page.tsx
│   ├── tenant/
│   │   ├── dashboard/
│   │   └── join/
│   └── layout.tsx
├── api/
│   ├── address/
│   │   └── route.ts
│   ├── admin/
│   │   ├── auth/
│   │   ├── properties/
│   │   ├── screenings/
│   │   └── users/
│   ├── application-invites/
│   │   └── [id]/
│   ├── inspections/
│   │   ├── [reportId]/
│   │   ├── token/
│   │   └── route.ts
│   ├── cron/
│   │   ├── awaabs/
│   │   ├── compliance/
│   │   └── rent-reminders/
│   ├── documents/
│   │   ├── [id]/
│   │   ├── upload/
│   │   └── route.ts
│   ├── maintenance/
│   │   ├── [id]/
│   │   └── route.ts
│   ├── payment/
│   │   ├── charge/
│   │   ├── has-card/
│   │   ├── remove-card/
│   │   ├── save-card/
│   │   ├── setup-intent/
│   │   └── subscription/
│   ├── payments/
│   │   ├── [id]/
│   │   └── route.ts
│   ├── properties/
│   │   ├── [id]/
│   │   └── route.ts
│   ├── scoring/
│   │   ├── [reportId]/
│   │   └── upload/
│   ├── screening/
│   │   ├── credits/
│   │   ├── history/
│   │   ├── invite/
│   │   ├── invites/
│   │   ├── purchase/
│   │   ├── report/
│   │   ├── select-tenant/
│   │   └── upload/
│   ├── stripe/
│   │   └── webhook/
│   ├── tenancies/
│   │   └── route.ts
│   ├── tenant/
│   │   ├── application-link-email/
│   │   ├── apply/
│   │   ├── invite/
│   │   ├── join/
│   │   └── send-invite/
│   ├── tenant-documents/
│   │   ├── [id]/
│   │   ├── upload/
│   │   └── route.ts
│   ├── tenants/
│   │   └── [id]/
│   ├── user/
│   │   └── profile/
│   └── waitlist/
│       └── route.ts
├── auth/
│   └── callback/
│       └── route.ts
├── fonts/
│   ├── GeistMonoVF.woff
│   └── GeistVF.woff
├── cookie-consent-overrides.css
├── error.tsx
├── favicon.ico
├── global-error.tsx
├── globals.css
├── icon.svg
├── layout.tsx
├── robots.ts
└── sitemap.ts

lib/
├── email-templates/
│   ├── base.ts
│   └── index.ts
├── notifications/
│   ├── cron-awaabs.ts
│   ├── cron-compliance.ts
│   ├── cron-rent-reminders.ts
│   └── registry.ts
├── scoring/
│   ├── engine.ts
│   ├── index.ts
│   └── logger.ts
├── supabase/
│   ├── auth.ts
│   ├── client.ts
│   ├── otp.ts
│   └── server.ts
├── admin-auth.ts
├── inspection-pdf.ts
├── inspection-storage.ts
├── crisp-support.ts
├── env.ts
├── error-toast.ts
├── form-styles.ts
├── guides.ts
├── image-utils.ts
├── maintenance-storage.ts
├── os-places.ts
├── payment-service.ts
├── payments.ts
├── posthog.ts
├── prisma.ts
├── resend.ts
├── room-utils.ts
├── screening-pricing.ts
├── storage.ts
├── stripe.ts
└── utils.ts

components/
├── dashboard/
│   ├── NameModal.tsx
│   ├── NameModalGate.tsx
│   └── shell.tsx
├── guides/
│   └── MDXComponents.tsx
├── shared/
│   ├── Analytics.tsx
│   ├── CookieConsent.tsx
│   ├── CrispChat.tsx
│   ├── DocumentUploadModal.tsx
│   ├── Footer.tsx
│   ├── JsonLd.tsx
│   ├── PaymentSetupModal.tsx
│   ├── PostHogIdentify.tsx
│   ├── PostHogProvider.tsx
│   ├── ScoringProgressScreen.tsx
│   ├── ScreeningReportDisplay.tsx
│   └── TenantDetailsForm.tsx
└── ui/
    └── sonner.tsx

scripts/
├── generate-article.ts
├── generate-og.mjs
├── generate-supabase-email-templates.ts
└── update-docs.ts

prisma/
├── schema.prisma
└── seed-scoring.ts

supabase/
└── migrations/
    ├── 20260302_waitlist.sql
    ├── 20260303_core_schema.sql
    ├── 20260304_add_property_name.sql
    ├── 20260305_enable_rls.sql
    ├── 20260306_tenant_model.sql
    ├── 20260307_tenants_rls.sql
    ├── 20260308_property_documents.sql
    ├── 20260309_add_application_invites.sql
    ├── 20260310_tenancy_tenant_relation.sql
    ├── 20260311_tenant_documents.sql
    ├── 20260312_maintenance_requests.sql
    ├── 20260313_financial_scoring.sql
    ├── 20260314_maintenance_photos_history.sql
    ├── 20260315_rls_unrestricted_tables.sql
    ├── 20260316_financial_report_multi_file.sql
    ├── 20260317_financial_report_validation.sql
    ├── 20260318_strengthen_liquidity_penalties.sql
    ├── 20260319_screening_packages.sql
    ├── 20260320_declared_income_and_rules.sql
    ├── 20260321_screening_invites.sql
    ├── 20260322_screening_rls.sql
    ├── 20260323_payment_fields.sql
    ├── 20260324_select_tenant_fields.sql
    ├── 20260325_rooms_and_checkin.sql
    ├── 20260326_add_performance_indexes.sql
    ├── 20260327_add_rls_policies.sql
    ├── 20260328_compliance_alert_log.sql
    ├── 20260329_maintenance_awaabs_law.sql
    └── 20260330_add_screening_logs.sql
```

---

## Critical Rules (applies to every task)

1. All monetary values in pence integers — never floats
2. Import UI primitives from `lib/form-styles`, `lib/ui`, `lib/utils` — never define inline
3. Full spec in `UI.md` — read before building any UI
4. Always generate signed URLs (60 min expiry) — never expose raw storage paths
5. Never expose Supabase service role key to the browser
6. Never skip input validation on API routes
7. Every new table needs RLS + policies in the same migration file
8. Register all new email notifications in `lib/notifications/registry.ts`
9. Tenancy = agreement, Tenant = person — never add contact fields to Tenancy
10. Never store passwords — auth is OTP via Supabase
11. Never generate legal text from scratch — AI fills pre-approved templates only
12. Never expose raw AI output — always parse, validate, and clean with `cleanSummary()`
13. Return user-friendly messages — never expose stack traces
14. Never use `prisma.$executeRaw` without parameterized queries

**Full rules list: `CLAUDE.NEVERDO.md` (32 rules) | Implementation patterns: `CLAUDE.PATTERNS.md`**

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ── Payment enums ─────────────────────────────────────────────────────────────

enum SubscriptionStatus {
  NONE
  ACTIVE
  PAST_DUE
  CANCELLED
}

enum PaymentMethodStatus {
  NONE
  SAVED
}

// ── User ──────────────────────────────────────────────────────────────────────
// Mirrors Supabase auth.users — id is the Supabase user UUID
model User {
  id             String     @id
  email          String     @unique
  name           String?
  createdAt      DateTime   @default(now()) @map("created_at")

  // ── Payment / Stripe placeholders ──────────────────────────────────────────
  stripeCustomerId       String?              @unique @map("stripe_customer_id")
  stripeSubscriptionId   String?              @unique @map("stripe_subscription_id")
  stripePaymentMethodId  String?              @map("stripe_payment_method_id")
  paymentMethodStatus    PaymentMethodStatus  @default(NONE) @map("payment_method_status")
  cardLast4              String?              @map("card_last4")
  cardBrand              String?              @map("card_brand")
  cardExpiry             String?              @map("card_expiry")

  // ── Subscription ───────────────────────────────────────────────────────────
  subscriptionStatus        SubscriptionStatus @default(NONE) @map("subscription_status")
  subscriptionPropertyCount Int                @default(0) @map("subscription_property_count")
  subscriptionMonthlyAmount Int                @default(0) @map("subscription_monthly_amount")
  currentPeriodEnd          DateTime?          @map("current_period_end")

  properties        Property[]
  tenantProfiles    Tenant[]
  screeningPackages ScreeningPackage[]
  screeningInvites  ScreeningInvite[]

  @@map("users")
}

// ── Property ──────────────────────────────────────────────────────────────────

enum PropertyType {
  FLAT
  HOUSE
  HMO
  OTHER
}

enum PropertyStatus {
  VACANT
  APPLICATION_OPEN
  OFFER_ACCEPTED
  ACTIVE
  NOTICE_GIVEN
}

model Property {
  id               String         @id @default(cuid())
  userId           String         @map("user_id")
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  name             String?
  line1            String
  line2            String?
  city             String
  postcode         String
  type             PropertyType   @default(FLAT)
  bedrooms         Int?
  status           PropertyStatus @default(VACANT)
  applicationToken String?        @unique @map("application_token")
  requireFinancialVerification Boolean @default(false) @map("require_financial_verification")
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  tenancies           Tenancy[]
  complianceDocs      ComplianceDoc[]
  tenants             Tenant[]
  documents           PropertyDocument[]
  maintenanceRequests MaintenanceRequest[]
  financialReports    FinancialReport[]
  rooms               PropertyRoom[]
  inspections      PropertyInspection[]
  applicationInvites  ApplicationInvite[]

  @@index([userId])
  @@map("properties")
}

// ── ComplianceDoc ─────────────────────────────────────────────────────────────

enum ComplianceDocType {
  GAS_SAFETY
  EPC
  EICR
  HOW_TO_RENT
}

enum ComplianceDocStatus {
  MISSING
  VALID
  EXPIRING
  EXPIRED
}

model ComplianceDoc {
  id          String              @id @default(cuid())
  propertyId  String              @map("property_id")
  property    Property            @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  type        ComplianceDocType
  status      ComplianceDocStatus @default(MISSING)
  fileUrl     String?             @map("file_url")
  issuedDate  DateTime?           @map("issued_date")
  expiryDate  DateTime?           @map("expiry_date")
  // How to Rent specific
  issued      Boolean             @default(false)
  version     String?
  aiExtracted Boolean             @default(false) @map("ai_extracted")
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")

  @@unique([propertyId, type])
  @@map("compliance_docs")
}

// ── Tenancy ───────────────────────────────────────────────────────────────────

enum TenancyStatus {
  PENDING
  ACTIVE
  NOTICE_GIVEN
  ENDED
}

model Tenancy {
  id                 String        @id @default(cuid())
  propertyId         String        @map("property_id")
  property           Property      @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  tenantId           String?       @map("tenant_id")
  tenant             Tenant?       @relation(fields: [tenantId], references: [id])
  startDate          DateTime?     @map("start_date")
  endDate            DateTime?     @map("end_date")
  monthlyRent        Int?          @map("monthly_rent") // pence
  paymentDay         Int?          @map("payment_day") // 1–31
  status             TenancyStatus @default(PENDING)
  depositAmount      Int?          @map("deposit_amount") // pence
  depositScheme      String?       @map("deposit_scheme")
  depositRef         String?       @map("deposit_ref")
  depositProtected   Boolean       @default(false) @map("deposit_protected")
  depositProtectedAt DateTime?     @map("deposit_protected_at")
  portalToken        String?       @unique @map("portal_token")
  contractUrl        String?       @map("contract_url")
  createdAt          DateTime      @default(now()) @map("created_at")
  updatedAt          DateTime      @updatedAt @map("updated_at")
  payments           RentPayment[]

  @@index([propertyId])
  @@index([tenantId])
  @@index([propertyId, status])
  @@map("tenancies")
}

// ── RentPayment ───────────────────────────────────────────────────────────────

enum PaymentStatus {
  PENDING  // upcoming, not yet due
  EXPECTED // due date reached, not yet marked as received
  RECEIVED // landlord manually confirmed
  LATE     // overdue, not received
  PARTIAL  // partial payment received
}

model RentPayment {
  id             String        @id @default(uuid())
  tenancyId      String        @map("tenancy_id")
  tenancy        Tenancy       @relation(fields: [tenancyId], references: [id], onDelete: Cascade)
  amount         Int           // pence
  dueDate        DateTime      @map("due_date")
  receivedDate   DateTime?     @map("received_date")
  receivedAmount Int?          @map("received_amount") // pence, for partial payments
  status         PaymentStatus @default(PENDING)
  note           String?
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  @@index([tenancyId])
  @@index([tenancyId, dueDate])
  @@index([status, dueDate])
  @@map("rent_payments")
}

// ── Tenant ────────────────────────────────────────────────────────────────────

enum TenantStatus {
  CANDIDATE     // Applied via link from OpenRent etc, not yet accepted
  INVITED       // Landlord added them manually, not yet confirmed
  TENANT        // Active tenant — has confirmed their details
  FORMER_TENANT
}

model Tenant {
  id          String       @id @default(uuid())
  userId      String?      @map("user_id")
  user        User?        @relation(fields: [userId], references: [id])
  propertyId  String       @map("property_id")
  property    Property     @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  name        String
  email       String
  phone       String?
  status      TenantStatus @default(INVITED)
  inviteToken String       @unique @map("invite_token") @default(uuid())
  confirmedAt     DateTime?    @map("confirmed_at")
  onboardingState Json?        @map("onboarding_state")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  tenancies           Tenancy[]
  documents           TenantDocument[]
  acknowledgments     DocumentAcknowledgment[]
  maintenanceRequests MaintenanceRequest[]
  financialReports    FinancialReport[]
  inspections      PropertyInspection[]

  @@index([propertyId])
  @@index([userId])
  @@index([email, status])
  @@map("tenants")
}

// ── TenantDocument ────────────────────────────────────────────────────────────

enum TenantDocumentType {
  PASSPORT
  RIGHT_TO_RENT
  PROOF_OF_INCOME
  BANK_STATEMENTS
  EMPLOYER_REFERENCE
  PREVIOUS_LANDLORD_REFERENCE
  GUARANTOR_AGREEMENT
  PET_AGREEMENT
  OTHER
}

model TenantDocument {
  id           String             @id @default(uuid())
  tenantId     String             @map("tenant_id")
  tenant       Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  documentType TenantDocumentType @map("document_type")
  fileName     String             @map("file_name")
  fileUrl      String             @map("file_url")
  fileSize     Int                @map("file_size")
  mimeType     String             @map("mime_type")
  uploadedBy   String             @map("uploaded_by")
  uploadedAt   DateTime           @default(now()) @map("uploaded_at")
  expiryDate   DateTime?          @map("expiry_date")
  note         String?

  @@index([tenantId])
  @@map("tenant_documents")
}

// ── PropertyDocument ──────────────────────────────────────────────────────────

enum DocumentType {
  GAS_SAFETY
  EPC
  EICR
  HOW_TO_RENT
  TENANCY_AGREEMENT
  INVENTORY_REPORT
  DEPOSIT_CERTIFICATE
  RIGHT_TO_RENT
  BUILDING_INSURANCE
  LANDLORD_INSURANCE
  SECTION_13_NOTICE
  SECTION_8_NOTICE
  CHECKOUT_INVENTORY
  OTHER
}

model PropertyDocument {
  id           String       @id @default(uuid())
  propertyId   String       @map("property_id")
  property     Property     @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  documentType DocumentType @map("document_type")
  fileName     String       @map("file_name")
  fileUrl      String       @map("file_url")
  fileSize     Int          @map("file_size") // bytes
  mimeType     String       @map("mime_type")
  uploadedAt   DateTime     @default(now()) @map("uploaded_at")
  expiryDate   DateTime?    @map("expiry_date")

  acknowledgments DocumentAcknowledgment[]

  @@index([propertyId])
  @@map("property_documents")
}

model DocumentAcknowledgment {
  id             String           @id @default(uuid())
  documentId     String           @map("document_id")
  document       PropertyDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  tenantId       String           @map("tenant_id")
  tenant         Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  acknowledgedAt DateTime         @default(now()) @map("acknowledged_at")

  @@unique([documentId, tenantId])
  @@map("document_acknowledgments")
}

// ── MaintenanceRequest ─────────────────────────────────────────────────────────

enum MaintenanceStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
}

enum MaintenancePriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model MaintenanceRequest {
  id             String              @id @default(uuid())
  propertyId     String              @map("property_id")
  property       Property            @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  tenantId       String              @map("tenant_id")
  tenant         Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  title          String
  description    String
  priority       MaintenancePriority @default(MEDIUM)
  status         MaintenanceStatus   @default(OPEN)
  category       String?             // e.g. 'DAMP_MOULD' — triggers Awaab's Law timer
  respondBy      DateTime?           @map("respond_by") // Awaab's Law: auto-set to createdAt + 24h for DAMP_MOULD
  inProgressAt   DateTime?           @map("in_progress_at")
  resolvedAt     DateTime?           @map("resolved_at")
  resolvedBy     String?             @map("resolved_by")
  createdAt      DateTime            @default(now()) @map("created_at")
  updatedAt      DateTime            @updatedAt @map("updated_at")

  statusHistory  MaintenanceStatusHistory[]
  photos         MaintenancePhoto[]

  @@index([propertyId])
  @@index([tenantId])
  @@index([propertyId, status])
  @@map("maintenance_requests")
}

model MaintenanceStatusHistory {
  id        String              @id @default(uuid())
  requestId String              @map("request_id")
  request   MaintenanceRequest  @relation(fields: [requestId], references: [id], onDelete: Cascade)
  fromStatus MaintenanceStatus? @map("from_status")
  toStatus   MaintenanceStatus  @map("to_status")
  changedBy  String             @map("changed_by")
  changedAt  DateTime           @default(now()) @map("changed_at")
  note       String?

  @@index([requestId])
  @@map("maintenance_status_history")
}

model MaintenancePhoto {
  id         String             @id @default(uuid())
  requestId  String             @map("request_id")
  request    MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  uploadedBy String             @map("uploaded_by")
  role       String             // "TENANT" | "LANDLORD"
  fileUrl    String             @map("file_url")
  fileName   String             @map("file_name")
  fileSize   Int                @map("file_size")
  uploadedAt DateTime           @default(now()) @map("uploaded_at")
  caption    String?

  @@index([requestId])
  @@map("maintenance_photos")
}

// ── Financial Scoring ──────────────────────────────────────────────────────────

enum ScoringCategory {
  AFFORDABILITY
  STABILITY
  DEBT
  GAMBLING
  LIQUIDITY
  POSITIVE
}

model ScoringRule {
  id          String          @id @default(uuid())
  category    ScoringCategory
  key         String          @unique
  description String
  points      Int
  isActive    Boolean         @default(true) @map("is_active")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  @@map("scoring_rules")
}

model ScoringConfig {
  id        String   @id @default(uuid())
  version   Int      @unique
  isActive  Boolean  @default(false) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("scoring_configs")
}

enum ReportType {
  LANDLORD_REQUESTED
  SELF_REQUESTED
}

enum ReportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model FinancialReport {
  id                   String       @id @default(uuid())
  tenantId             String?      @map("tenant_id")
  tenant               Tenant?      @relation(fields: [tenantId], references: [id])
  propertyId           String?      @map("property_id")
  property             Property?    @relation(fields: [propertyId], references: [id])
  reportType           ReportType   @map("report_type")
  status               ReportStatus @default(PENDING)
  scoringConfigVersion Int          @map("scoring_config_version")
  totalScore           Int?         @map("total_score")
  grade                String?
  aiSummary            String?      @map("ai_summary")
  breakdown            Json?
  appliedRules         Json?        @map("applied_rules")
  verificationToken    String       @unique @default(uuid()) @map("verification_token")
  pdfUrl               String?      @map("pdf_url")
  statementFiles       Json?        @map("statement_files")
  applicantName        String?      @map("applicant_name")
  jointApplicants      Json?        @map("joint_applicants")
  hasUnverifiedFiles   Boolean      @default(false) @map("has_unverified_files")
  verificationWarning  String?      @map("verification_warning")
  declaredIncomePence  Int?         @map("declared_income_pence")
  validationResults    Json?        @map("validation_results")
  failureReason        String?      @map("failure_reason")
  screeningUsageId     String?      @unique @map("screening_usage_id")
  screeningUsage       ScreeningPackageUsage? @relation(fields: [screeningUsageId], references: [id])
  inviteId             String?      @map("invite_id")
  invite               ScreeningInvite? @relation(fields: [inviteId], references: [id])
  isLocked             Boolean      @default(true) @map("is_locked")
  monthlyRentPence     Int?         @map("monthly_rent_pence")
  createdAt            DateTime     @default(now()) @map("created_at")
  updatedAt            DateTime     @updatedAt @map("updated_at")

  screeningLogs ScreeningLog[]

  @@index([tenantId])
  @@index([propertyId])
  @@index([inviteId])
  @@index([inviteId, status])
  @@map("financial_reports")
}

// ── Screening Logs ──────────────────────────────────────────────────────────

model ScreeningLog {
  id                String          @id @default(cuid())
  screeningReportId String          @map("screening_report_id")
  createdAt         DateTime        @default(now()) @map("created_at")
  stage             String          // INIT, PDF, VERIFY, VALIDATE, ANALYSE, SCORE, SAVE, COMPLETE, ERROR
  level             String          // INFO, WARN, ERROR
  message           String
  data              Json?
  screeningReport   FinancialReport @relation(fields: [screeningReportId], references: [id], onDelete: Cascade)

  @@index([screeningReportId])
  @@map("screening_logs")
}

// ── Screening Invites ─────────────────────────────────────────────────────────

enum ScreeningInviteStatus {
  PENDING
  STARTED
  COMPLETED
  PAID
  EXPIRED
}

model ScreeningInvite {
  id               String                @id @default(uuid())
  landlordId       String                @map("landlord_id")
  landlord         User                  @relation(fields: [landlordId], references: [id], onDelete: Cascade)
  candidateName    String                @map("candidate_name")
  candidateEmail   String                @map("candidate_email")
  propertyAddress  String                @map("property_address")
  monthlyRentPence Int                   @map("monthly_rent_pence")
  status           ScreeningInviteStatus @default(PENDING)
  token            String                @unique @default(uuid())
  rejectionSentAt  DateTime?             @map("rejection_sent_at")
  createdAt        DateTime              @default(now()) @map("created_at")
  updatedAt        DateTime              @default(now()) @map("updated_at")

  reports FinancialReport[]

  @@index([landlordId])
  @@index([landlordId, status])
  @@map("screening_invites")
}

// ── Screening Packages ───────────────────────────────────────────────────────

enum ScreeningPackageType {
  SINGLE
  TRIPLE
  SIXER
  TEN
}

enum ScreeningPaymentStatus {
  PENDING
  MOCK_PAID
  PAID
  REFUNDED
}

model ScreeningPackage {
  id            String                  @id @default(uuid())
  userId        String                  @map("user_id")
  user          User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  packageType   ScreeningPackageType    @map("package_type")
  totalCredits  Int                     @map("total_credits")
  usedCredits   Int                     @default(0) @map("used_credits")
  pricePence    Int                     @map("price_pence")
  paymentStatus ScreeningPaymentStatus  @default(PENDING) @map("payment_status")
  stripeSessionId String?              @map("stripe_session_id")
  createdAt     DateTime                @default(now()) @map("created_at")
  updatedAt     DateTime                @updatedAt @map("updated_at")

  usages ScreeningPackageUsage[]

  @@index([userId])
  @@index([userId, paymentStatus])
  @@map("screening_packages")
}

model ScreeningPackageUsage {
  id              String           @id @default(uuid())
  packageId       String           @map("package_id")
  package         ScreeningPackage @relation(fields: [packageId], references: [id], onDelete: Cascade)
  candidateName   String           @map("candidate_name")
  monthlyRentPence Int             @map("monthly_rent_pence")
  createdAt       DateTime         @default(now()) @map("created_at")

  report FinancialReport?

  @@index([packageId])
  @@map("screening_package_usages")
}

// ── Property Rooms ──────────────────────────────────────────────────────────

enum RoomType {
  BEDROOM
  LIVING_ROOM
  KITCHEN
  BATHROOM
  WC
  HALLWAY
  DINING_ROOM
  UTILITY_ROOM
  GARDEN
  GARAGE
  LOFT
  CONSERVATORY
  OTHER
}

model PropertyRoom {
  id         String   @id @default(uuid())
  propertyId String   @map("property_id")
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  type       RoomType
  name       String
  floor      Int?
  order      Int      @default(0)
  createdAt  DateTime @default(now()) @map("created_at")

  photos InspectionPhoto[]

  @@index([propertyId])
  @@map("property_rooms")
}

// ── Property Inspections ────────────────────────────────────────────────────

enum InspectionStatus {
  DRAFT
  PENDING
  IN_REVIEW
  AGREED
  DISPUTED
}

model PropertyInspection {
  id                  String              @id @default(uuid())
  propertyId          String              @map("property_id")
  property            Property            @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  tenantId            String?             @map("tenant_id")
  tenant              Tenant?             @relation(fields: [tenantId], references: [id])
  status              InspectionStatus @default(DRAFT)
  token               String              @unique @default(uuid())
  landlordConfirmedAt DateTime?           @map("landlord_confirmed_at")
  tenantConfirmedAt   DateTime?           @map("tenant_confirmed_at")
  pdfUrl              String?             @map("pdf_url")
  pdfGeneratedAt      DateTime?           @map("pdf_generated_at")
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")

  photos InspectionPhoto[]

  @@index([propertyId])
  @@index([tenantId])
  @@map("property_inspections")
}

// ── Compliance Alert Log ────────────────────────────────────────────────────
// Deduplication log for cron-triggered compliance/deposit alerts.

model ComplianceAlertLog {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  notificationId String   @map("notification_id")
  referenceId    String   @map("reference_id")
  sentAt         DateTime @default(now()) @map("sent_at")

  @@index([notificationId, referenceId, sentAt])
  @@map("compliance_alert_log")
}

// ── Application Invites ─────────────────────────────────────────────────────
// Tracks emails sent via "Invite applicants" on the property page.
// Persisted so invites survive page reload. Merged with Tenant CANDIDATE
// records on the client to build a unified applicant list.

model ApplicationInvite {
  id         String   @id @default(cuid())
  propertyId String   @map("property_id")
  email      String
  sentAt     DateTime @default(now()) @map("sent_at")
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([propertyId, email])
  @@index([propertyId])
  @@map("application_invites")
}

// GDPR: Inspection photos retained for tenancy duration + 3 months
model InspectionPhoto {
  id             String              @id @default(uuid())
  inspectionId   String              @map("inspection_id")
  inspection     PropertyInspection  @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  roomId         String?             @map("room_id")
  room           PropertyRoom?       @relation(fields: [roomId], references: [id])
  roomName       String              @map("room_name")
  uploadedBy     String              @map("uploaded_by") // "LANDLORD" | "TENANT"
  uploaderName   String              @map("uploader_name")
  fileUrl        String              @map("file_url")
  caption        String?
  condition      String?             // "GOOD" | "MINOR_ISSUE" | "DAMAGE"
  takenAt        DateTime?           @map("taken_at")
  createdAt      DateTime            @default(now()) @map("created_at")

  @@index([inspectionId])
  @@index([roomId])
  @@map("inspection_photos")
}
```

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Property management | LIVE | CRUD, compliance docs, document management, cascade delete with type-to-confirm |
| Tenant pipeline | LIVE | Apply → Candidate → Invited → Tenant lifecycle. ApplicationInvite persists emailed invites; merged with CANDIDATE tenants for unified applicant list on property page |
| Tenant portal | LIVE | Auth-protected, docs, rent, maintenance, inspection |
| Document management | LIVE | 14 types, drag-drop upload, signed URLs |
| Rent tracking | LIVE | Auto-generate payments, manual mark received |
| Maintenance requests | LIVE | Priority, status, photos, audit trail |
| Compliance alerts | LIVE | Dashboard dots, alert bar, expiry tracking |
| Financial screening (invite flow) | BETA | Landlord invites → candidate uploads → AI analysis |
| Financial screening (credit packs) | BETA | Buy packs, upload directly (legacy flow) |
| Screening report unlock | MOCK | isLocked=false (MOCK_PAID, no real Stripe yet) |
| Admin panel | LIVE | Cookie-based auth, user/property CRUD, screenings management (bulk delete, file download, debug logs viewer) |
| Onboarding wizard | LIVE | 5-step first-run for new landlords (property → rooms → occupancy → tenant → done) |
| Name capture modal | LIVE | Undismissable modal for landlords with no name set |
| Settings page | LIVE | Display name edit |
| Property inspections | BETA | Property rooms, photo capture, tenant/landlord sign-off, tenant dashboard section, auth-aware header on inspection page |
| Financial Passport | PRE-LAUNCH | Email capture landing page only |
| Google Analytics | LIVE | Consent Mode v2 — script loads unconditionally, `gtag('config')` must be called after consent defaults (otherwise GA defers all hits indefinitely). gtag function must use `arguments` (not rest params) — Google's gtag.js expects Arguments objects in dataLayer. `vanilla-cookieconsent` `onConsent`/`onChange` callbacks fire `gtag('consent', 'update', ...)` |
| Live chat (Crisp) | LIVE | Marketing pages only |
| Demo login | LIVE | Landlord + tenant demo buttons on login page, env-var gated |
| Stripe payments | PHASE 1 | Client + webhook + SetupIntent card flow. Charges still mock (Phase 2–4 pending) |

---

## Email System

### Architecture
- `lib/resend.ts` — Resend client, FROM: `LetSorted <no-reply@letsorted.co.uk>`, console fallback if no API key
- `lib/email-templates/base.ts` — Unified base template wrapper (all emails use this)
- `lib/email-templates/index.ts` — 9 email template functions

### Base Template (`baseEmailTemplate`)
- Background: `#F7F8F6`
- Card: 600px max-width, white, 8px border-radius, 40px/48px padding
- Header: house emoji + "LetSorted" in `#2D6A4F` (brand green), subtitle below
- Divider: `#F0F0F0` 1px border
- Footer: copyright + letsorted.co.uk
- Mobile: `@media (max-width: 620px)` reduces padding to 32px/24px
- Outlook: table-based CTA buttons for compatibility
- Preview text: zero-width joiners for inbox preview

### Template Functions
| Function | Used By | Purpose |
|---|---|---|
| `tenantInviteHtml` | api/tenant/invite, send-invite | Invite tenant to portal |
| `applicationReceivedHtml` | api/tenant/apply | Confirm application to applicant |
| `newApplicationHtml` | api/tenant/apply | Notify landlord of new application |
| `applicationLinkHtml` | api/tenant/application-link-email | Send apply URL to prospect |
| `candidateInviteHtml` | api/screening/invite | Invite candidate for financial check |
| `landlordNotificationHtml` | lib/scoring/engine.ts | Notify landlord: screening complete |
| `inspectionReviewHtml` | api/inspections/[reportId] | Ask tenant to review inspection report |
| `inspectionTenantResponseHtml` | api/inspections/token/[token]/confirm | Notify landlord: tenant confirmed/disputed

---

## PDF Engine — `lib/pdf-engine/`

**This is an isolated module. Do not modify its internals.**

All PDF generation goes through one function:

```typescript
import { generatePDF } from '@/lib/pdf-engine'

const result = await generatePDF({
  template: 'inspection-report',
  data: { ... }  // InspectionReportData — see lib/pdf-engine/types.ts
})
// result.buffer → write to Supabase storage
// result.filename → suggested filename
```

### Available templates
| template | Document | Status |
|---|---|---|
| `screening-report` | AI financial screening result | ⏸ Stub |
| `inspection-report` | Property inspection with dual-party photos | ⏸ Stub |
| `apt-contract` | Assured Periodic Tenancy agreement | ⏸ Stub |
| `section-8-notice` | Notice seeking possession | ⏸ Stub |
| `section-13-notice` | Rent increase notice | ⏸ Stub |
| `dispute-pack` | Multi-section deposit/tribunal evidence pack | ⏸ Stub |

### Mapper pattern
Use `lib/pdf-mappers.ts` (see rules 28–32 in `CLAUDE.NEVERDO.md`):
```typescript
import { buildInspectionPDF } from '@/lib/pdf-mappers'
const buffer = await buildInspectionPDF(reportId)
```

- `lib/inspection-pdf.ts` is deprecated — new code uses `buildInspectionPDF()` from pdf-mappers.ts
- Agent docs: `lib/pdf-engine/AGENT.md`

---

## PROTECTED NOTES — DO NOT OVERWRITE
<!--
  This section survives doc regeneration.
  Content has been split into focused files for readability.
  The update-docs script will never modify this section.
-->

Protected notes are maintained in two focused files:
- **CLAUDE.PATTERNS.md** — implementation patterns and design decisions (scoring engine, payment flows, cascade delete, Stripe Phase 1, etc.)
- **CLAUDE.NEVERDO.md** — 32 hard rules (security, data integrity, UI consistency, screening, PDF engine)

See those files for the full protected notes content.
