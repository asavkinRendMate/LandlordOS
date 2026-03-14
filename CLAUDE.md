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
│   │   ├── payments/
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
│   ├── sign/
│   │   └── contract/
│   ├── terms/
│   │   └── page.tsx
│   ├── updates/
│   │   └── page.tsx
│   ├── verify/
│   │   └── [token]/
│   ├── client.tsx
│   ├── layout.tsx
│   └── page.tsx
├── (tenant)/
│   ├── apply/
│   │   └── [propertyId]/
│   ├── check-in/
│   │   └── [token]/
│   ├── passport/
│   │   └── page.tsx
│   ├── tenant/
│   │   ├── dashboard/
│   │   ├── inspection/
│   │   └── join/
│   └── layout.tsx
├── api/
│   ├── address/
│   │   └── route.ts
│   ├── admin/
│   │   ├── auth/
│   │   ├── dev/
│   │   ├── properties/
│   │   ├── screenings/
│   │   └── users/
│   ├── application-invites/
│   │   └── [id]/
│   ├── auth/
│   │   └── send-otp/
│   ├── contracts/
│   │   ├── [tenancyId]/
│   │   ├── generate/
│   │   ├── token/
│   │   └── upload/
│   ├── cron/
│   │   ├── awaabs/
│   │   ├── compliance/
│   │   ├── demo-cleanup/
│   │   ├── inspections/
│   │   └── rent-reminders/
│   ├── demo/
│   │   └── create/
│   ├── documents/
│   │   ├── [id]/
│   │   ├── upload/
│   │   └── route.ts
│   ├── inspection-schedules/
│   │   └── route.ts
│   ├── inspections/
│   │   ├── [reportId]/
│   │   ├── acknowledge/
│   │   ├── token/
│   │   └── route.ts
│   ├── maintenance/
│   │   ├── [id]/
│   │   └── route.ts
│   ├── payment/
│   │   ├── charge/
│   │   ├── has-card/
│   │   ├── purchase-pack/
│   │   ├── remove-card/
│   │   ├── save-card/
│   │   ├── setup-intent/
│   │   ├── subscription/
│   │   └── unlock-price/
│   ├── payments/
│   │   ├── [id]/
│   │   └── route.ts
│   ├── properties/
│   │   ├── [id]/
│   │   └── route.ts
│   ├── scoring/
│   │   ├── [reportId]/
│   │   ├── process/
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
│   │   ├── portal/
│   │   └── webhook/
│   ├── tenancies/
│   │   └── route.ts
│   ├── tenant/
│   │   ├── application-link-email/
│   │   ├── apply/
│   │   ├── contract/
│   │   ├── inspections/
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
├── not-found.tsx
├── robots.ts
└── sitemap.ts

lib/
├── email-templates/
│   ├── base.ts
│   ├── contract.ts
│   └── index.ts
├── notifications/
│   ├── cron-awaabs.ts
│   ├── cron-compliance.ts
│   ├── cron-inspections.ts
│   ├── cron-rent-reminders.ts
│   └── registry.ts
├── pdf-engine/
│   ├── components/
│   │   ├── clause-block.ts
│   │   ├── footer.ts
│   │   ├── header.ts
│   │   ├── party-block.ts
│   │   ├── photo-grid.ts
│   │   ├── signature-block.ts
│   │   └── table.ts
│   ├── templates/
│   │   ├── apt-contract.ts
│   │   ├── cover-sheet.ts
│   │   ├── dispute-pack.ts
│   │   ├── inspection-report.ts
│   │   ├── screening-report.ts
│   │   ├── section-13-notice.ts
│   │   └── section-8-notice.ts
│   ├── AGENT.md
│   ├── index.ts
│   ├── loadLogo.ts
│   ├── renderer.ts
│   ├── test.ts
│   └── types.ts
├── scoring/
│   ├── engine.ts
│   ├── index.ts
│   └── logger.ts
├── supabase/
│   ├── auth.ts
│   ├── client.ts
│   ├── otp.ts
│   └── server.ts
├── validators/
│   └── postcode.ts
├── admin-auth.ts
├── crisp-support.ts
├── env.ts
├── error-toast.ts
├── form-styles.ts
├── guides.ts
├── image-utils.ts
├── inspection-pdf.ts
├── inspection-schedule.ts
├── inspection-storage.ts
├── maintenance-storage.ts
├── os-places.ts
├── pay-per-use-pricing.ts
├── payment-service.ts
├── payments.ts
├── pdf-mappers.ts
├── posthog.ts
├── prisma.ts
├── resend.ts
├── room-utils.ts
├── screening-pricing.ts
├── screening-unlock.ts
├── storage-url.ts
├── storage.ts
├── stripe.ts
├── subscription-guard.ts
├── ui.tsx
├── updates.ts
└── utils.ts

components/
├── dashboard/
│   ├── DemoBanner.tsx
│   ├── NameModal.tsx
│   ├── NameModalGate.tsx
│   ├── shell.tsx
│   └── UpgradeBanner.tsx
├── guides/
│   └── MDXComponents.tsx
├── inspections/
│   ├── index.ts
│   ├── InspectionCard.tsx
│   ├── InspectionTimeline.tsx
│   └── InspectionTypeBadge.tsx
├── properties/
│   ├── DeletePropertyModal.tsx
│   └── SectionHelpModal.tsx
├── screening-flow/
│   ├── CandidateResultScreen.tsx
│   ├── PackPurchaseModal.tsx
│   ├── ScreeningCard.tsx
│   └── ScreeningLayout.tsx
├── shared/
│   ├── Analytics.tsx
│   ├── CookieConsent.tsx
│   ├── CrispChat.tsx
│   ├── DemoUpsell.tsx
│   ├── DocumentUploadModal.tsx
│   ├── Footer.tsx
│   ├── JsonLd.tsx
│   ├── PaymentSetupModal.tsx
│   ├── PostHogIdentify.tsx
│   ├── PostHogProvider.tsx
│   ├── ScoringProgressScreen.tsx
│   ├── ScreeningReportDisplay.tsx
│   └── TenantDetailsForm.tsx
├── ui/
│   ├── SegmentedControl.tsx
│   └── sonner.tsx
└── DemoModal.tsx

scripts/
├── fix-storage-paths.ts
├── generate-article.ts
├── generate-og.mjs
├── generate-supabase-email-templates.ts
└── update-docs.ts

prisma/
├── demo-seed.ts
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
    ├── 20260330_add_screening_logs.sql
    ├── 20260331_financial_verification_default_true.sql
    ├── 20260332_add_missing_indexes.sql
    ├── 20260333_payments_and_cycle.sql
    ├── 20260334_rename_checkin_to_inspection.sql
    ├── 20260335_periodic_inspections.sql
    ├── 20260336_inspection_day_reminders.sql
    ├── 20260337_add_tenancy_contracts.sql
    └── 20260338_add_is_demo_field.sql
```

---

## Database Schema

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
  isDemo         Boolean    @default(false) @map("is_demo")
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
  payments          Payment[]

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
  requireFinancialVerification Boolean @default(true) @map("require_financial_verification")
  screeningCycleResetAt DateTime? @map("screening_cycle_reset_at")
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  tenancies           Tenancy[]
  complianceDocs      ComplianceDoc[]
  tenants             Tenant[]
  documents           PropertyDocument[]
  maintenanceRequests MaintenanceRequest[]
  financialReports    FinancialReport[]
  rooms               PropertyRoom[]
  inspections         PropertyInspection[]
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
  @@index([expiryDate])
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
  inspectionSchedule InspectionSchedule?
  contract           TenancyContract?

  @@index([propertyId])
  @@index([tenantId])
  @@index([propertyId, status])
  @@index([status])
  @@index([status, depositProtected])
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
  inspections         PropertyInspection[]

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
  @@index([tenantId])
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
  @@index([status, respondBy])
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
  @@index([status])
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

enum InspectionType {
  MOVE_IN
  PERIODIC
  MOVE_OUT
}

enum InspectionStatus {
  DRAFT
  PENDING
  IN_REVIEW
  AGREED
  DISPUTED
}

model PropertyInspection {
  id                  String           @id @default(uuid())
  propertyId          String           @map("property_id")
  property            Property         @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  tenantId            String?          @map("tenant_id")
  tenant              Tenant?          @relation(fields: [tenantId], references: [id])
  inspectionType      InspectionType   @default(MOVE_IN) @map("inspection_type")
  inspectionNumber    Int              @default(1) @map("inspection_number")
  scheduledDate       DateTime?        @map("scheduled_date")
  scheduledTime       String?          @map("scheduled_time") // "HH:MM" format, 08:00–20:00
  dayOfReminderSentAt DateTime?        @map("day_of_reminder_sent_at")
  noticeSeenAt        DateTime?        @map("notice_seen_at")
  noticeToken         String?          @unique @map("notice_token")
  status              InspectionStatus @default(DRAFT)
  token               String           @unique @default(uuid())
  landlordConfirmedAt DateTime?        @map("landlord_confirmed_at")
  tenantConfirmedAt   DateTime?        @map("tenant_confirmed_at")
  pdfUrl              String?          @map("pdf_url")
  pdfGeneratedAt      DateTime?        @map("pdf_generated_at")
  createdAt           DateTime         @default(now()) @map("created_at")
  updatedAt           DateTime         @updatedAt @map("updated_at")

  photos InspectionPhoto[]

  @@index([propertyId])
  @@index([tenantId])
  @@index([propertyId, inspectionType])
  @@map("property_inspections")
}

// ── Inspection Schedule ─────────────────────────────────────────────────────
// One schedule per tenancy — controls periodic inspection frequency.

model InspectionSchedule {
  id              String   @id @default(uuid())
  tenancyId       String   @unique @map("tenancy_id")
  tenancy         Tenancy  @relation(fields: [tenancyId], references: [id], onDelete: Cascade)
  frequencyMonths Int      @map("frequency_months") // 3 or 6
  nextDueDate     DateTime @map("next_due_date")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("inspection_schedules")
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
  @@index([userId])
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
  id           String              @id @default(uuid())
  inspectionId String              @map("inspection_id")
  inspection   PropertyInspection  @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  roomId       String?             @map("room_id")
  room         PropertyRoom?       @relation(fields: [roomId], references: [id])
  roomName     String              @map("room_name")
  uploadedBy   String              @map("uploaded_by") // "LANDLORD" | "TENANT"
  uploaderName String              @map("uploader_name")
  fileUrl      String              @map("file_url")
  caption      String?
  condition    String?             // "GOOD" | "MINOR_ISSUE" | "DAMAGE"
  takenAt      DateTime?           @map("taken_at")
  createdAt    DateTime            @default(now()) @map("created_at")

  @@index([inspectionId])
  @@index([roomId])
  @@map("inspection_photos")
}

// ── Tenancy Contract ──────────────────────────────────────────────────────────

enum ContractStatus {
  PENDING_GENERATION
  PENDING_SIGNATURES
  LANDLORD_SIGNED
  TENANT_SIGNED
  BOTH_SIGNED
  VOIDED
}

enum ContractType {
  GENERATED
  UPLOADED
}

model TenancyContract {
  id                  String         @id @default(cuid())
  tenancyId           String         @unique @map("tenancy_id")
  tenancy             Tenancy        @relation(fields: [tenancyId], references: [id], onDelete: Cascade)
  type                ContractType
  status              ContractStatus @default(PENDING_GENERATION)
  pdfUrl              String?        @map("pdf_url")
  landlordToken       String         @unique @default(uuid()) @map("landlord_token")
  tenantToken         String         @unique @default(uuid()) @map("tenant_token")
  landlordSignedAt    DateTime?      @map("landlord_signed_at")
  landlordSignedName  String?        @map("landlord_signed_name")
  landlordSignedIp    String?        @map("landlord_signed_ip")
  tenantSignedAt      DateTime?      @map("tenant_signed_at")
  tenantSignedName    String?        @map("tenant_signed_name")
  tenantSignedIp      String?        @map("tenant_signed_ip")
  createdAt           DateTime       @default(

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

1. All monetary values in pence integers — never floats  <!-- Auto-preserved by update-docs -->
2. Import UI primitives from `lib/form-styles`, `lib/ui`, `lib/utils` — never define inline  <!-- Auto-preserved by update-docs -->
4. Always generate signed URLs (60 min expiry) — never expose raw storage paths  <!-- Auto-preserved by update-docs -->
5. Never expose Supabase service role key to the browser  <!-- Auto-preserved by update-docs -->
6. Never skip input validation on API routes  <!-- Auto-preserved by update-docs -->
9. Tenancy = agreement, Tenant = person — never add contact fields to Tenancy  <!-- Auto-preserved by update-docs -->
10. Never store passwords — auth is OTP via Supabase  <!-- Auto-preserved by update-docs -->
11. Never generate legal text from scratch — AI fills pre-approved templates only  <!-- Auto-preserved by update-docs -->
12. Never expose raw AI output — always parse, validate, and clean with `cleanSummary()`  <!-- Auto-preserved by update-docs -->
13. Return user-friendly messages — never expose stack traces  <!-- Auto-preserved by update-docs -->
14. Never use `prisma.$executeRaw` without parameterized queries  <!-- Auto-preserved by update-docs -->
**Full rules list: `CLAUDE.NEVERDO.md` (32 rules) | Implementation patterns: `CLAUDE.PATTERNS.md`**  <!-- Auto-preserved by update-docs -->
**This is an isolated module. Do not modify its internals.**  <!-- Auto-preserved by update-docs -->
Use `lib/pdf-mappers.ts` (see rules 28–32 in `CLAUDE.NEVERDO.md`):  <!-- Auto-preserved by update-docs -->
