# CLAUDE.md — Project Instructions

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
| Auth | Supabase Auth (magic link only — no passwords) |
| Storage | Supabase Storage (5 private buckets) |
| Email | Resend (`lib/resend.ts`, console fallback in dev) |
| Payments | Stripe (not yet integrated — mock-paid flow in use) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Live Chat | Crisp (via `NEXT_PUBLIC_CRISP_WEBSITE_ID`) |
| Hosting | Vercel |
| Styling | Tailwind CSS + shadcn/ui (New York style) |
| Validation | Zod **v4** — use `error:` not `errorMap:` for custom messages |
| PDF | pdf-lib (compression, splitting) |

---

## Project Structure

```
/
├── app/
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── login/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── maintenance/
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── properties/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── check-in/page.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── tenant/[tenantId]/page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (marketing)/
│   │   ├── cookies/page.tsx
│   │   ├── features/
│   │   │   ├── issue-management/page.tsx
│   │   │   ├── move-in/page.tsx
│   │   │   ├── property-management/page.tsx
│   │   │   ├── tenancy-renewal/page.tsx
│   │   │   └── tenant-screening/page.tsx
│   │   ├── guides/
│   │   │   ├── [slug]/page.tsx
│   │   │   └── page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── renters-rights-act/page.tsx
│   │   ├── screening/
│   │   │   ├── apply/[token]/page.tsx
│   │   │   ├── invites/page.tsx
│   │   │   ├── packages/page.tsx
│   │   │   ├── report/[inviteId]/page.tsx
│   │   │   ├── sent/page.tsx
│   │   │   ├── use/page.tsx
│   │   │   └── page.tsx
│   │   ├── terms/page.tsx
│   │   ├── verify/[token]/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (tenant)/
│   │   ├── apply/[propertyId]/page.tsx
│   │   ├── check-in/[token]/page.tsx
│   │   ├── passport/page.tsx
│   │   ├── tenant/
│   │   │   ├── dashboard/page.tsx
│   │   │   └── join/[token]/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── address/route.ts
│   │   ├── admin/
│   │   │   ├── auth/route.ts
│   │   │   ├── properties/
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── route.ts
│   │   │   └── users/
│   │   │       ├── [id]/route.ts
│   │   │       └── route.ts
│   │   ├── cron/
│   │   │   ├── awaabs/route.ts
│   │   │   ├── compliance/route.ts
│   │   │   └── rent-reminders/route.ts
│   │   ├── check-in/
│   │   │   ├── [reportId]/
│   │   │   │   ├── photos/
│   │   │   │   │   ├── [photoId]/route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── token/[token]/
│   │   │   │   ├── confirm/route.ts
│   │   │   │   ├── photos/route.ts
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── documents/
│   │   │   ├── [id]/
│   │   │   │   ├── acknowledge/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── upload/route.ts
│   │   │   └── route.ts
│   │   ├── maintenance/
│   │   │   ├── [id]/
│   │   │   │   ├── photos/
│   │   │   │   │   ├── [photoId]/route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── payment/ (placeholder — not integrated)
│   │   ├── payments/
│   │   │   ├── [id]/route.ts
│   │   │   └── route.ts
│   │   ├── properties/
│   │   │   ├── [id]/
│   │   │   │   ├── rooms/route.ts
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── scoring/
│   │   │   ├── [reportId]/
│   │   │   │   ├── declarations/route.ts
│   │   │   │   └── route.ts
│   │   │   └── upload/route.ts
│   │   ├── screening/
│   │   │   ├── credits/route.ts
│   │   │   ├── history/route.ts
│   │   │   ├── invite/
│   │   │   │   ├── [token]/
│   │   │   │   │   ├── started/route.ts
│   │   │   │   │   ├── submit/route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── invites/
│   │   │   │   ├── [id]/route.ts
│   │   │   │   ├── all/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── purchase/route.ts
│   │   │   ├── report/[inviteId]/unlock/route.ts
│   │   │   ├── select-tenant/route.ts
│   │   │   └── upload/route.ts
│   │   ├── tenancies/route.ts
│   │   ├── tenant/
│   │   │   ├── application-link-email/route.ts
│   │   │   ├── apply/
│   │   │   │   ├── property/[propertyId]/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── invite/route.ts
│   │   │   ├── join/[token]/route.ts
│   │   │   └── send-invite/route.ts
│   │   ├── tenant-documents/
│   │   │   ├── [id]/route.ts
│   │   │   ├── upload/route.ts
│   │   │   └── route.ts
│   │   ├── tenants/[id]/route.ts
│   │   ├── user/profile/route.ts
│   │   └── waitlist/route.ts
│   ├── auth/callback/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── robots.ts
├── components/
│   ├── dashboard/
│   │   ├── NameModal.tsx
│   │   ├── NameModalGate.tsx
│   │   └── shell.tsx
│   ├── guides/
│   │   └── MDXComponents.tsx
│   └── shared/
│       ├── Analytics.tsx
│       ├── CookieConsent.tsx
│       ├── CrispChat.tsx
│       ├── DocumentUploadModal.tsx
│       ├── Footer.tsx
│       ├── JsonLd.tsx
│       ├── PaymentSetupModal.tsx
│       ├── ScoringProgressScreen.tsx
│       ├── ScreeningReportDisplay.tsx
│       └── TenantDetailsForm.tsx
├── lib/
│   ├── email-templates/
│   │   ├── base.ts
│   │   └── index.ts
│   ├── notifications/
│   │   ├── cron-awaabs.ts
│   │   ├── cron-compliance.ts
│   │   ├── cron-rent-reminders.ts
│   │   └── registry.ts
│   ├── scoring/
│   │   ├── engine.ts
│   │   └── index.ts
│   ├── supabase/
│   │   ├── auth.ts
│   │   ├── client.ts
│   │   ├── otp.ts
│   │   └── server.ts
│   ├── admin-auth.ts
│   ├── check-in-pdf.ts
│   ├── check-in-storage.ts
│   ├── env.ts
│   ├── form-styles.ts
│   ├── guides.ts
│   ├── image-utils.ts
│   ├── maintenance-storage.ts
│   ├── os-places.ts
│   ├── payment-service.ts
│   ├── payments.ts
│   ├── prisma.ts
│   ├── resend.ts
│   ├── room-utils.ts
│   ├── screening-pricing.ts
│   ├── storage.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── seed-scoring.ts
├── supabase/migrations/
└── scripts/
```

---

## Database Schema (Prisma)

```prisma
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
model User {
  id             String     @id          // Supabase auth.users UUID
  email          String     @unique
  name           String?
  createdAt      DateTime   @default(now()) @map("created_at")
  
  // Payment / Stripe placeholders
  stripeCustomerId       String?              @unique @map("stripe_customer_id")
  stripeSubscriptionId   String?              @unique @map("stripe_subscription_id")
  stripePaymentMethodId  String?              @map("stripe_payment_method_id")
  paymentMethodStatus    PaymentMethodStatus  @default(NONE) @map("payment_method_status")
  cardLast4              String?              @map("card_last4")
  cardBrand              String?              @map("card_brand")
  cardExpiry             String?              @map("card_expiry")
  
  // Subscription
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
enum PropertyType   { FLAT HOUSE HMO OTHER }
enum PropertyStatus { VACANT APPLICATION_OPEN OFFER_ACCEPTED ACTIVE NOTICE_GIVEN }

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
  checkInReports      CheckInReport[]
  @@map("properties")
}

// ── ComplianceDoc ─────────────────────────────────────────────────────────────
enum ComplianceDocType   { GAS_SAFETY EPC EICR HOW_TO_RENT }
enum ComplianceDocStatus { MISSING VALID EXPIRING EXPIRED }

model ComplianceDoc {
  id          String              @id @default(cuid())
  propertyId  String              @map("property_id")
  property    Property            @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  type        ComplianceDocType
  status      ComplianceDocStatus @default(MISSING)
  fileUrl     String?             @map("file_url")
  issuedDate  DateTime?           @map("issued_date")
  expiryDate  DateTime?           @map("expiry_date")
  issued      Boolean             @default(false)
  version     String?
  aiExtracted Boolean             @default(false) @map("ai_extracted")
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")
  @@unique([propertyId, type])
  @@map("compliance_docs")
}

// ── Tenancy ───────────────────────────────────────────────────────────────────
enum TenancyStatus { PENDING ACTIVE NOTICE_GIVEN ENDED }

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
  @@map("tenancies")
}

// ── RentPayment ───────────────────────────────────────────────────────────────
enum PaymentStatus { PENDING EXPECTED RECEIVED LATE PARTIAL }

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
  @@map("rent_payments")
}

// ── Tenant ────────────────────────────────────────────────────────────────────
enum TenantStatus { CANDIDATE INVITED TENANT FORMER_TENANT }

model Tenant {
  id              String       @id @default(uuid())
  userId          String?      @map("user_id")
  user            User?        @relation(fields: [userId], references: [id])
  propertyId      String       @map("property_id")
  property        Property     @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  name            String
  email           String
  phone           String?
  status          TenantStatus @default(INVITED)
  inviteToken     String       @unique @map("invite_token") @default(uuid())
  confirmedAt     DateTime?    @map("confirmed_at")
  onboardingState Json?        @map("onboarding_state")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  tenancies           Tenancy[]
  documents           TenantDocument[]
  acknowledgments     DocumentAcknowledgment[]
  maintenanceRequests MaintenanceRequest[]
  financialReports    FinancialReport[]
  checkInReports      CheckInReport[]
  @@map("tenants")
}

// ── Financial Scoring ──────────────────────────────────────────────────────────
enum ScoringCategory { AFFORDABILITY STABILITY DEBT GAMBLING LIQUIDITY POSITIVE }
enum ReportType      { LANDLORD_REQUESTED SELF_REQUESTED }
enum ReportStatus    { PENDING PROCESSING COMPLETED FAILED }

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
  @@map("financial_reports")
}

// ── Screening Invites ─────────────────────────────────────────────────────────
enum ScreeningInviteStatus { PENDING STARTED COMPLETED PAID EXPIRED }

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
  reports          FinancialReport[]
  @@map("screening_invites")
}

// ── Screening Packages ───────────────────────────────────────────────────────
enum ScreeningPackageType   { SINGLE TRIPLE SIXER TEN }
enum ScreeningPaymentStatus { PENDING MOCK_PAID PAID REFUNDED }

model ScreeningPackage {
  id              String                  @id @default(uuid())
  userId          String                  @map("user_id")
  user            User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  packageType     ScreeningPackageType    @map("package_type")
  totalCredits    Int                     @map("total_credits")
  usedCredits     Int                     @default(0) @map("used_credits")
  pricePence      Int                     @map("price_pence")
  paymentStatus   ScreeningPaymentStatus  @default(PENDING) @map("payment_status")
  stripeSessionId String?                 @map("stripe_session_id")
  createdAt       DateTime                @default(now()) @map("created_at")
  updatedAt       DateTime                @updatedAt @map("updated_at")
  usages          ScreeningPackageUsage[]
  @@map("screening_packages")
}

model ScreeningPackageUsage {
  id               String           @id @default(uuid())
  packageId        String           @map("package_id")
  package          ScreeningPackage @relation(fields: [packageId], references: [id], onDelete: Cascade)
  candidateName    String           @map("candidate_name")
  monthlyRentPence Int              @map("monthly_rent_pence")
  createdAt        DateTime         @default(now()) @map("created_at")
  report           FinancialReport?
  @@map("screening_package_usages")
}

// ── Property Rooms ──────────────────────────────────────────────────────────
enum RoomType {
  BEDROOM LIVING_ROOM KITCHEN BATHROOM WC HALLWAY
  DINING_ROOM UTILITY_ROOM GARDEN GARAGE LOFT CONSERVATORY OTHER
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
  photos     CheckInPhoto[]
  @@map("property_rooms")
}

// ── Check-in Reports ────────────────────────────────────────────────────────
enum CheckInReportStatus { DRAFT PENDING IN_REVIEW AGREED DISPUTED }

model CheckInReport {
  id                  String              @id @default(uuid())
  propertyId          String              @map("property_id")
  property            Property            @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  tenantId            String?             @map("tenant_id")
  tenant              Tenant?             @relation(fields: [tenantId], references: [id])
  status              CheckInReportStatus @default(DRAFT)
  token               String              @unique @default(uuid())
  landlordConfirmedAt DateTime?           @map("landlord_confirmed_at")
  tenantConfirmedAt   DateTime?           @map("tenant_confirmed_at")
  pdfUrl              String?             @map("pdf_url")
  pdfGeneratedAt      DateTime?           @map("pdf_generated_at")
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")
  photos              CheckInPhoto[]
  @@map("check_in_reports")
}

model CheckInPhoto {
  id           String          @id @default(uuid())
  reportId     String          @map("report_id")
  report       CheckInReport   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  roomId       String?         @map("room_id")
  room         PropertyRoom?   @relation(fields: [roomId], references: [id])
  roomName     String          @map("room_name")
  uploadedBy   String          @map("uploaded_by") // "LANDLORD" | "TENANT"
  uploaderName String          @map("uploader_name")
  fileUrl      String          @map("file_url")
  caption      String?
  condition    String?         // "GOOD" | "MINOR_ISSUE" | "DAMAGE"
  takenAt      DateTime?       @map("taken_at")
  createdAt    DateTime        @default(now()) @map("created_at")
  @@map("check_in_photos")
}

// ── Documents & Maintenance (abbreviated) ─────────────────────────────────────
enum TenantDocumentType {
  PASSPORT RIGHT_TO_RENT PROOF_OF_INCOME BANK_STATEMENTS
  EMPLOYER_REFERENCE PREVIOUS_LANDLORD_REFERENCE
  GUARANTOR_AGREEMENT PET_AGREEMENT OTHER
}
enum DocumentType {
  GAS_SAFETY EPC EICR HOW_TO_RENT TENANCY_AGREEMENT INVENTORY_REPORT
  DEPOSIT_CERTIFICATE RIGHT_TO_RENT BUILDING_INSURANCE LANDLORD_INSURANCE
  SECTION_13_NOTICE SECTION_8_NOTICE CHECKOUT_INVENTORY OTHER
}
enum MaintenanceStatus   { OPEN IN_PROGRESS RESOLVED }
enum MaintenancePriority { LOW MEDIUM HIGH URGENT }

model TenantDocument { /* full schema */ }
model PropertyDocument { /* full schema */ }
model DocumentAcknowledgment { /* full schema */ }
model MaintenanceRequest { /* full schema */ }
model MaintenanceStatusHistory { /* full schema */ }
model MaintenancePhoto { /* full schema */ }
model ScoringRule { /* full schema */ }
model ScoringConfig { /* full schema */ }
model ComplianceAlertLog { /* dedup log for cron compliance/deposit alerts */ } // Updated: 2026-03-09 — compliance alert cron job
```

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Property management | LIVE | CRUD, compliance docs, document management |
| Tenant pipeline | LIVE | Apply → Candidate → Invited → Tenant lifecycle |
| Tenant portal | LIVE | Auth-protected, docs, rent, maintenance, check-in inspection |
| Document management | LIVE | 14 types, drag-drop upload, signed URLs |
| Rent tracking | LIVE | Auto-generate payments, manual mark received |
| Maintenance requests | LIVE | Priority, status, photos, audit trail |
| Compliance alerts | LIVE | Dashboard dots, alert bar, expiry tracking |
| Financial screening (invite flow) | BETA | Landlord invites → candidate uploads → AI analysis |
| Financial screening (credit packs) | BETA | Buy packs, upload directly (legacy flow) |
| Screening report unlock | MOCK | isLocked=false (MOCK_PAID, no real Stripe yet) |
| Admin panel | LIVE | Cookie-based auth, user/property CRUD |
| Onboarding wizard | LIVE | 5-step first-run for new landlords (property → rooms → occupancy → tenant → done) |
| Name capture modal | LIVE | Undismissable modal for landlords with no name set |
| Settings page | LIVE | Display name edit |
| Check-in reports | BETA | Property rooms, photo capture, tenant/landlord sign-off, tenant dashboard section // Updated: 2026-03-09 — tenant check-in photo condition + dispute fix |
| Financial Passport | PRE-LAUNCH | Email capture landing page only |
| Live chat (Crisp) | LIVE | Marketing pages only |
| Demo login | LIVE | Landlord + tenant demo buttons on login page, env-var gated |
| Stripe payments | NOT STARTED | All purchases use MOCK_PAID |

---

## AI Financial Scoring Engine

### Overview
`lib/scoring/engine.ts` — AI-powered bank statement analysis via Claude API (direct `fetch` to `https://api.anthropic.com/v1/messages`). Model: `claude-sonnet-4-20250514`.

### Flow
1. Upload 1–5 PDF bank statements → create `FinancialReport` (PENDING)
2. `analyzeStatement(reportId)` runs in background:
   - Download PDFs from Supabase Storage
   - Compress if >2MB (pdf-lib), split in half if still >2MB
   - **Name verification**: per-file Claude call to match statement name vs applicant name
   - **Period validation**: extract statement date ranges, check ≥60 days coverage, ≤6 months old
   - **Financial analysis**: send all PDFs + scoring rules to Claude, get back fired rules + metrics
   - **Synthesis**: if PDF was split, analyse halves separately then merge with synthesis call
   - Apply gambling/income-discrepancy deduplication
   - Calculate score (start at 100, apply rule points)
   - Server-side sanity checks (income ratio caps, coverage caps, rent-to-income caps)
   - Save results → COMPLETED
3. If invite flow: update invite status → COMPLETED, email landlord notification

### Scoring
- 32 active scoring rules across 6 categories: AFFORDABILITY, STABILITY, DEBT, GAMBLING, LIQUIDITY, POSITIVE
- Score starts at 100, rules add/subtract points. Clamped to 0–100.
- Grades: Excellent (90+), Good (75+), Fair (60+), Poor (45+), High Risk (<45)
- Gambling dedup: only the highest applicable gambling penalty (ABOVE_10_PCT > ABOVE_5_PCT > ANY)
- Income discrepancy dedup: only the highest applicable penalty (MAJOR > SIGNIFICANT > SLIGHT)
- `cleanSummary()` strips chain-of-thought from AI output before DB save
- Seed script: `npx tsx prisma/seed-scoring.ts`

### JSON extraction safety
Claude sometimes returns prose before JSON. All 3 parse locations use:
```typescript
if (!jsonStr.startsWith('{')) {
  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
  }
}
```

### Candidate view
Candidates see only a neutral "reliability score" (never grade labels or "/100"). Score-range messaging:
- 75+: green, "strong financial profile"
- 60–74: amber, "good financial profile"
- 45–59: amber, "submitted for review"
- <45: grey, neutral message

---

## Screening Pricing

### Invite Flow (primary)
Landlord sends invite → candidate uploads → report generated → landlord pays to unlock.
- Report is `isLocked: true` by default
- Unlock sets `isLocked: false`, invite status → PAID
- Currently MOCK_PAID (no real Stripe integration yet)

### Credit Pack Flow (legacy, still functional)
Defined in `lib/screening-pricing.ts`:

| Pack | Credits | Price | Per Check |
|---|---|---|---|
| Single | 1 | £11.99 | £11.99 |
| Triple | 3 | £19.99 | £6.66 |
| Sixer | 6 | £29.99 | £5.00 |
| Ten Pack | 10 | £39.99 | £4.00 |

Subscriber (Pro plan): First check £9.99, additional £1.49 each.

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
| `checkInReviewHtml` | api/check-in/[reportId] | Ask tenant to review check-in report |
| `checkInTenantResponseHtml` | api/check-in/token/[token]/confirm | Notify landlord: tenant confirmed/disputed |
| `checkInCompleteHtml` | lib/check-in-pdf.ts | Send tenant PDF download link |

### Helpers (from base.ts)
- `ctaButton(text, href)` — table-based green CTA button
- `infoBox(text)` — green highlight box (addresses, etc.)
- `greyBox(innerHtml)` — grey callout box (stats, quotes)
- `p(text)` — paragraph with consistent styling
- `muted(text)` — small grey disclaimer text

---

## Key Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Database — IMPORTANT: port 5432 is blocked on Supabase free tier.
# Use supabase CLI (installed as dev dep) instead of prisma migrate dev.
./node_modules/.bin/supabase db push   # Apply SQL migrations in supabase/migrations/
npx prisma generate                    # Regenerate Prisma client after schema change
npx prisma studio                      # Open Prisma Studio (DB GUI)
# Migration workflow: write SQL in supabase/migrations/YYYYMMDD_name.sql,
# then run supabase db push (prompts for confirmation), then prisma generate.

# Scoring rules
npx tsx prisma/seed-scoring.ts         # Seed 32 scoring rules + ScoringConfig v1

# Build & Deploy
npm run build            # Production build
npm run lint             # ESLint check
npx tsc --noEmit         # TypeScript check

# Cron jobs (vercel.json) // Updated: 2026-03-09 — rent reminder cron notifications
# /api/cron/compliance — daily 9am UTC, protected by CRON_SECRET header
# /api/cron/rent-reminders — daily 8am UTC, tenant rent reminders (5d, today, overdue max 7d)
```

---

## Supabase RLS Rules

Every new table MUST include in its migration file: // Updated: 2026-03-09 — RLS always required for new tables

1. **Enable RLS:**
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

2. **Add at minimum these policies:**
   - Landlord/owner SELECT: `WHERE user_id = auth.uid()` (or via FK join to a table with `user_id`)
   - Landlord/owner INSERT/UPDATE/DELETE: same condition
   - Tenant SELECT (where applicable): via tenancy/property FK chain

3. **Reference examples:** check existing migrations for `check_in_reports`, `property_rooms` as the pattern to follow.

4. **After migration:** verify table shows globe icon (not UNRESTRICTED) in Supabase Table Editor.

This is a security requirement, not optional.

---

## Code Conventions

### General
- TypeScript strict mode — no `any`, no `as unknown as`
- All monetary values stored in **pence** (integers), never floats
- All dates stored as `DateTime` (UTC), displayed in UK locale
- Environment variables accessed only via `lib/env.ts` (validated with zod)

### API Routes
- All API routes in `app/api/` return `{ data, error }` shape
- Auth check at the top of every protected route using `createAuthClient()` from `lib/supabase/auth.ts`
- Input validation with `zod` before any DB operation
- Admin routes use `verifyAdminSession()` from `lib/admin-auth.ts` (cookie-based, separate from Supabase)

### Components
- Server Components by default, `"use client"` only when necessary
- Form state with `react-hook-form` + `zod` resolver
- Loading states with `Suspense` boundaries, not manual `isLoading`
- Zod version is **v4** — use `error:` not `errorMap:` for custom messages
- Form field styles in `lib/form-styles.ts` — `inputClass`, `selectClass` (full-width), `selectClassCompact` (fixed-width for flex rows). All `<select>` elements use `appearance-none` + `.select-chevron` CSS class for consistent custom arrow. Never define inline select/input styles per-page — import from form-styles.
- Room type dropdowns: options sorted alphabetically via `ROOM_TYPE_LABELS` object order in `lib/room-utils.ts`
- Property detail RoomsSection: bedroom picker (1–6) is two-way synced with room list — picker highlights based on BEDROOM-type room count; clicking picker adds/removes bedroom rows; manually adding/removing bedroom rooms updates picker highlight
- All inputs must have `font-size >= 16px` on mobile to prevent iOS Safari auto-zoom on focus (global rule in `globals.css`) // Updated: 2026-03-09 — prevent iOS input zoom

### Shared Components
- `DocumentUploadModal.tsx` — reusable drag-and-drop upload modal
  - Props: `isOpen`, `onClose`, `onUploaded`, `uploadEndpoint`, `extraFields`, `documentTypes`, `expiryDateTypes?`, `preselectedType?`, `title?`
  - Used for property docs (`/api/documents/upload`) and tenant docs (`/api/tenant-documents/upload`)
- `ScreeningReportDisplay.tsx` — reusable report renderer
  - Props: `scoring`, `applicantName?`, `isLocked?`, `onUnlock?`, `unlocking?`, `showVerificationLink?`, `candidateView?`
  - Handles locked (blurred) and unlocked (full) states
- `ScoringProgressScreen.tsx` — animated progress screen with polling
  - Shows SVG logo, step-by-step progress, polling for report status
- `TenantDetailsForm.tsx` — shared form for tenant name/email/phone editing
- `Analytics.tsx` — GA, Clarity, FB Pixel init, gated by cookie consent // Updated: 2026-03-08 — FB Pixel fix
  - Consent events: listen on `window` (vanilla-cookieconsent v3 uses global `dispatchEvent`)
  - GA + Clarity require `analytics` consent; FB Pixel requires `marketing` consent
- `PostHogProvider.tsx` — PostHog initialisation, cookie-consent-gated session recording, manual SPA pageview capture
  - EU data residency (`eu.i.posthog.com`); session recording only after `analytics` cookie consent
- `PostHogIdentify.tsx` — calls `posthog.identify(userId)` with Supabase UUID only (no PII)

### Supabase Storage
- `lib/storage.ts` — general helpers (uploadFile, getSignedUrl, deleteFile), optional `bucket` param (defaults to `'documents'`)
- `lib/maintenance-storage.ts` — dedicated helpers for maintenance photos
- `lib/check-in-storage.ts` — dedicated helpers for check-in photos
- Five private buckets (auto-created on first upload):
  - `documents` — property-level documents + check-in report PDFs
  - `tenant-documents` — tenant-level documents
  - `maintenance-photos` — maintenance request photos
  - `bank-statements` — uploaded bank statement PDFs
  - `check-in-photos` — check-in report room photos
- Storage path patterns:
  - Property docs: `/{userId}/{propertyId}/{documentId}/{filename}`
  - Tenant docs: `/{propertyId}/{tenantId}/{documentId}/{filename}`
  - Maintenance photos: `/{requestId}/{role}/{photoId}-{filename}`
  - Bank statements: `/{reportId}/{filename}`
  - Check-in photos: `/{propertyId}/{reportId}/{roomId}/{photoId}-{filename}`
  - Check-in PDFs: `check-in-reports/{reportId}/check-in-report.pdf` (in `documents` bucket)
- Always generate signed URLs (60 min expiry) — never expose raw storage paths

### Rent Payments
- `lib/payments.ts` has two helpers called on every payments page load:
  - `generateUpcomingPayments(tenancyId)` — creates RentPayment records for next 3 months (idempotent)
  - `updatePaymentStatuses()` — PENDING→EXPECTED (due today), PENDING/EXPECTED→LATE (overdue)
- Landlord manually marks payments received with date, amount (supports partial), and optional note

### Maintenance
- `MaintenanceRequest` has priority (URGENT/HIGH/MEDIUM/LOW) and status (OPEN/IN_PROGRESS/RESOLVED)
- `MaintenanceStatusHistory` — immutable audit trail, all status changes logged
- Dashboard overview shows top 3 active requests, sorted by priority then date

### Error Handling
- Use `try/catch` in all async server functions
- Log errors with `console.error` including context
- Return user-friendly messages, never expose stack traces

---

## Environment Variables

Validated in `lib/env.ts` (server-only, zod):

```env
# Database
DATABASE_URL=              # Supabase connection string (pooled, pgbouncer=true)
DIRECT_URL=                # Supabase direct connection (for migrations)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=            # Optional in dev — falls back to console.log

# Address lookup
OS_API_KEY=                # OS Places API key (postcode → address lookup)
OS_API_SECRET=             # OS Places API secret

# AI
ANTHROPIC_API_KEY=         # Used by scoring engine — optional

# App
NEXT_PUBLIC_APP_URL=       # e.g. https://letsorted.co.uk (used in invite/apply links)
CRON_SECRET=              # Optional — for cron endpoints

# Admin panel
ADMIN_USERNAME=            # Optional — for /admin login
ADMIN_PASSWORD=            # Optional — for /admin login

# Live Chat
NEXT_PUBLIC_CRISP_WEBSITE_ID=  # Optional — chat widget hidden if not set

# Analytics (optional — each tool is disabled when its key var is empty/unset)
# On/off switches: NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_CLARITY_ID, NEXT_PUBLIC_FB_PIXEL_ID
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_FB_PIXEL_ID=
NEXT_PUBLIC_CLARITY_ID=

# Error tracking — Sentry (optional — disabled when NEXT_PUBLIC_SENTRY_DSN is empty)
NEXT_PUBLIC_SENTRY_DSN=    # On/off switch — empty = Sentry disabled entirely
SENTRY_AUTH_TOKEN=         # Server-only — source map uploads (CI)
SENTRY_ORG=                # Sentry organisation slug
SENTRY_PROJECT=            # Sentry project slug

# Product analytics — PostHog (optional — disabled when NEXT_PUBLIC_POSTHOG_KEY is empty, EU data residency)
NEXT_PUBLIC_POSTHOG_KEY=   # On/off switch — empty = PostHog disabled entirely
NEXT_PUBLIC_POSTHOG_HOST=  # Default: https://eu.i.posthog.com

# Demo login (optional — all 4 vars required, buttons hidden if any is empty/unset) // Updated: 2026-03-09 — demo login buttons
NEXT_PUBLIC_DEMO_LANDLORD_EMAIL=     # e.g. demo.landlord.letsorted@gmail.com
NEXT_PUBLIC_DEMO_LANDLORD_PASSWORD=
NEXT_PUBLIC_DEMO_TENANT_EMAIL=       # e.g. demo.tenant.letsorted@gmail.com
NEXT_PUBLIC_DEMO_TENANT_PASSWORD=

# Payments (not yet integrated)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Important Business Rules

- **Free tier:** 1 property only. 2+ require paid subscription (£10/mo per property)
- **All contracts generated are APT** (Assured Periodic Tenancy) — not AST (abolished May 2026)
- **Rent increases:** only once per year via Section 13 Notice — enforce in UI
- **Awaab's Law:** DAMP_MOULD tickets automatically set `respondBy = createdAt + 24 hours`
- **Deposit deadline:** 30 days from tenancy start date — alert landlord if unprotected
- **Tenant notice period:** minimum 2 months — validate before allowing submission
- **Magic link only:** no password auth, no social login
- **Tenancy ↔ Tenant:** Tenancy = rental agreement; Tenant = person. Linked via `tenantId` FK. Never add contact fields to Tenancy.
- **Screening invite expiry:** 7 days from createdAt, lazily updated to EXPIRED on access
- **Backward compat:** Reports with `screeningUsageId` (credit-pack flow) are treated as unlocked even though `isLocked` defaults true
- **Check-in photo retention:** GDPR — check-in photos retained for tenancy duration + 3 months, then eligible for deletion
- **Tenant check-in photos:** tenant must select condition (GOOD/MINOR_ISSUE/DAMAGE) before upload — no default; optional comment (max 500 chars). Dispute flow accepts optional reason text, included in landlord notification email.

---

## What NOT to Do

- Never store passwords — auth is magic link via Supabase
- Never generate legal text from scratch — AI fills pre-approved templates only
- Never expose Supabase service role key to the browser
- Never store monetary amounts as floats — always pence integers
- Never skip input validation on API routes
- Never use `prisma.$executeRaw` without parameterized queries
- Never add tenantName/tenantEmail/tenantPhone to Tenancy — use the Tenant relation
- Never show grade labels or "/100" score to candidates — only show neutral reliability messaging
- Never expose raw AI output to users — always parse, validate, and clean with `cleanSummary()`
- Never create a new Supabase table without immediately enabling RLS and writing policies in the same migration file — pattern: see `supabase/migrations/20260327_add_rls_policies.sql` // Updated: 2026-03-09 — RLS policy requirements
- Never leave a table with UNRESTRICTED badge in Supabase dashboard — all tables must show globe icon (RLS enabled)
- Never add a new email notification without registering it in `lib/notifications/registry.ts` — every notification must have an entry with correct trigger, recipient, status, and templateFn. Without this, the notification will not appear in the admin panel and the task is considered incomplete. // Updated: 2026-03-09 — notifications registry + admin panel

---

## Notifications // Updated: 2026-03-09 — notifications registry + admin panel

- **Registry:** `lib/notifications/registry.ts` is the single source of truth for all email notifications
- **Admin panel:** `/admin/notifications` shows live status of all notifications
- **Trigger types:** `event` (fired from API routes), `cron` (fired from cron jobs), `event+cron` (fired by both — e.g. Awaab's Law: event on creation + cron 4h reminder)
- **Cron jobs** (`vercel.json`): compliance daily 9am UTC, Awaab's Law every 15 minutes, rent reminders daily 8am UTC
- **Deduplication:** `ComplianceAlertLog` table prevents duplicate sends (24h window for compliance, 2h for Awaab's Law, 23h for rent reminders)
- **Adding a new notification requires two steps:**
  1. Add the template function to `lib/email-templates/index.ts`
  2. Add an entry to `lib/notifications/registry.ts` with correct trigger, recipient, status, and templateFn

---

## PROTECTED NOTES — DO NOT OVERWRITE
<!--
  This section survives doc regeneration.
  Add implementation gotchas, warnings, and
  intentional design decisions here.
  The update-docs script will never modify
  this section.
-->

### Database Performance Notes
- **Indexes added:** 2026-03-08 (migration `20260326_add_performance_indexes.sql`)
- **30 indexes** added across 17 models — all FK fields + composite indexes for common query patterns
- Composite indexes: `[propertyId, status]` on Tenancy/MaintenanceRequest, `[landlordId, status]` on ScreeningInvite, `[inviteId, status]` on FinancialReport, `[email, status]` on Tenant, `[userId, paymentStatus]` on ScreeningPackage, `[tenancyId, dueDate]` and `[status, dueDate]` on RentPayment
- No N+1 patterns found — codebase uses `include` consistently
- Admin endpoints (`/api/admin/users`, `/api/admin/properties`) return all rows without pagination — acceptable for now but consider adding `take`/`skip` if user count grows
- Monitor unused indexes: `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;`
- Run `EXPLAIN ANALYZE` on slow queries via Supabase Dashboard SQL Editor