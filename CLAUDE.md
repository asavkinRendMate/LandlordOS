# CLAUDE.md — Project Instructions

## Project Overview

**LetSorted** (letsorted.co.uk) — UK property management SaaS for self-managing landlords (1–5 properties). Simple, practical tools: document management, tenant pipeline, rent tracking, compliance alerts. Renters' Rights Act 2025 compliance built in but not the primary pitch. Read `SPEC.md` for full product specification and `TASKS.md` for current sprint tasks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth (magic link only — no passwords) |
| Storage | Supabase Storage |
| Email | Resend |
| Payments | Stripe |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Hosting | Vercel |
| Styling | Tailwind CSS + shadcn/ui |

---

## Project Structure

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (magic link flow)
│   │   └── login/
│   ├── (dashboard)/              # Protected landlord dashboard
│   │   ├── layout.tsx            # Dashboard shell with sidebar (DashboardShell)
│   │   └── dashboard/
│   │       ├── page.tsx          # Overview: property cards, active maintenance preview, compliance alerts
│   │       ├── onboarding/       # First-run wizard (4 steps: property → occupancy → tenant → done)
│   │       ├── maintenance/
│   │       │   ├── page.tsx      # Maintenance list: all requests with status tabs + priority sort
│   │       │   └── [id]/page.tsx # Maintenance detail: status mgmt, photos, timeline (client component)
│   │       └── properties/
│   │           ├── page.tsx      # Properties list: all property cards + compliance alert bar
│   │           ├── [id]/
│   │           │   ├── page.tsx  # Property detail: compliance & docs, tenant card, applications, scoring
│   │           │   └── tenant/
│   │           │       └── [tenantId]/
│   │           │           ├── page.tsx    # Tenant detail: server component, auth check, serialize dates
│   │           │           └── client.tsx  # Tenant detail: R2R status box, docs sections, inline edit
│   │           └── new/
│   │               └── page.tsx  # Add property wizard (3 steps, same form as onboarding)
│   ├── (marketing)/              # Public marketing site
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing page + waitlist form + closed beta modal
│   │   ├── privacy/              # Privacy policy page
│   │   ├── terms/                # Terms of service page
│   │   └── verify/[token]/       # Financial report verification (public, token-based)
│   ├── (tenant)/                 # Tenant-facing pages
│   │   ├── layout.tsx
│   │   ├── apply/[propertyId]/   # Application form (public, no auth)
│   │   ├── passport/             # Financial Passport landing page (email capture, pre-launch)
│   │   └── tenant/
│   │       ├── join/[token]/     # Tenant onboarding / confirm details
│   │       └── dashboard/        # Tenant portal (auth-protected)
│   │           ├── page.tsx      # Server: fetch tenant + property, gate auth
│   │           └── client.tsx    # Client: property card, landlord docs, my docs, rent payments, maintenance
│   ├── auth/callback/            # Supabase magic-link callback
│   └── api/                      # API routes (all return { data, error })
│       ├── address/              # OS Places postcode lookup
│       ├── documents/
│       │   ├── route.ts          # GET: list PropertyDocuments for a property
│       │   ├── upload/           # POST: multipart upload → Supabase Storage + DB record
│       │   └── [id]/
│       │       ├── route.ts      # GET: signed URL; DELETE: remove from storage + DB
│       │       └── acknowledge/  # POST: tenant marks document as reviewed
│       ├── maintenance/
│       │   ├── route.ts          # GET: list requests (landlord or tenant); POST: create request
│       │   └── [id]/
│       │       ├── route.ts      # GET: request detail; PATCH: update status/priority
│       │       └── photos/
│       │           ├── route.ts      # GET: list photos (signed URLs); POST: upload photo
│       │           └── [photoId]/route.ts  # DELETE: remove photo (uploader or landlord)
│       ├── payments/
│       │   ├── route.ts          # GET: list RentPayments for property (landlord + tenant auth)
│       │   └── [id]/route.ts     # PATCH: mark payment received (date, amount, note)
│       ├── properties/
│       │   ├── route.ts          # GET: list; POST: create + seed ComplianceDocs
│       │   └── [id]/route.ts     # GET: property with relations; PATCH: update settings
│       ├── scoring/
│       │   ├── upload/route.ts   # POST: upload bank statement PDF, trigger AI analysis
│       │   └── [reportId]/route.ts  # GET: report status/results; POST: re-trigger analysis
│       ├── tenancies/route.ts    # POST: create tenancy + Tenant record in $transaction
│       ├── tenant/
│       │   ├── apply/
│       │   │   ├── route.ts      # POST: submit application (creates Candidate Tenant)
│       │   │   └── property/[propertyId]/route.ts  # GET: public property info for apply form
│       │   ├── application-link-email/  # POST: email application link to address
│       │   ├── join/[token]/     # GET: load invite; POST: confirm tenant details + send magic link
│       │   └── send-invite/      # POST: (re)send invite email to tenant
│       ├── tenant-documents/
│       │   ├── route.ts          # GET: list TenantDocuments by tenantId (owner or self)
│       │   ├── upload/           # POST: multipart upload → tenant-documents bucket + DB record
│       │   └── [id]/route.ts     # GET: signed URL (owner or self); DELETE: owner only
│       ├── tenants/
│       │   └── [id]/route.ts     # PATCH: update tenant name/email/phone (property owner only)
│       └── waitlist/route.ts     # POST: add email to waitlist
├── components/
│   ├── dashboard/
│   │   └── shell.tsx             # DashboardShell: sidebar, mobile drawer, context switcher
│   └── shared/
│       ├── DocumentUploadModal.tsx  # Reusable drag-and-drop upload modal (property + tenant docs)
│       └── Footer.tsx            # Shared footer (marketing + dashboard variants)
├── lib/
│   ├── env.ts                    # Zod-validated env vars (server-only)
│   ├── maintenance-storage.ts    # Supabase Storage helpers for maintenance-photos bucket
│   ├── payments.ts               # generateUpcomingPayments, updatePaymentStatuses helpers
│   ├── prisma.ts                 # Prisma client singleton
│   ├── resend.ts                 # Resend email client (console fallback if key not set)
│   ├── scoring/
│   │   ├── engine.ts             # AI scoring engine: Claude API bank statement analysis
│   │   └── index.ts              # Barrel export: analyzeStatement
│   ├── storage.ts                # Supabase Storage helpers (uploadFile, getSignedUrl, deleteFile)
│   │                             # Supports multiple buckets via optional bucket param
│   ├── os-places.ts              # OS Places API (postcode → address lookup)
│   ├── utils.ts                  # Shared utilities (cn, etc.)
│   └── supabase/
│       ├── auth.ts               # Cookie-based auth client (anon key, SSR)
│       ├── client.ts             # Browser client factory (anon key)
│       └── server.ts             # Server client factory (service role, bypasses RLS)
├── prisma/
│   ├── schema.prisma             # Single source of truth for DB schema
│   └── seed-scoring.ts           # Seed script: 30 scoring rules + ScoringConfig v1
├── supabase/
│   └── migrations/               # SQL migration files (applied via supabase db push)
└── middleware.ts                  # Protects /dashboard/* and /tenant/dashboard
```

---

## Database Schema (Prisma)

```prisma
// ── User ──────────────────────────────────────────────────────────────────────
model User {
  id             String     @id          // Supabase auth.users UUID
  email          String     @unique
  name           String?
  createdAt      DateTime   @default(now()) @map("created_at")
  properties     Property[]
  tenantProfiles Tenant[]
  @@map("users")
}

// ── Property ──────────────────────────────────────────────────────────────────
enum PropertyType   { FLAT HOUSE HMO OTHER }
enum PropertyStatus { VACANT APPLICATION_OPEN OFFER_ACCEPTED ACTIVE NOTICE_GIVEN }

model Property {
  id               String         @id @default(cuid())
  userId           String         @map("user_id")
  user             User           @relation(...)
  name             String?        // optional nickname
  line1            String
  line2            String?
  city             String
  postcode         String
  type             PropertyType   @default(FLAT)
  status           PropertyStatus @default(VACANT)
  applicationToken String?        @unique @map("application_token")
  requireFinancialVerification Boolean @default(false) @map("require_financial_verification")
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")
  tenancies           Tenancy[]
  complianceDocs      ComplianceDoc[]    // legacy — dashboard overview only
  tenants             Tenant[]
  documents           PropertyDocument[]
  maintenanceRequests MaintenanceRequest[]
  financialReports    FinancialReport[]
  @@map("properties")
}

// ── ComplianceDoc (legacy — used for dashboard compliance dots and alert bar) ─
enum ComplianceDocType   { GAS_SAFETY EPC EICR HOW_TO_RENT }
enum ComplianceDocStatus { MISSING VALID EXPIRING EXPIRED }

model ComplianceDoc {
  id          String              @id @default(cuid())
  propertyId  String              @map("property_id")
  property    Property            @relation(...)
  type        ComplianceDocType
  status      ComplianceDocStatus @default(MISSING)
  fileUrl     String?             @map("file_url")
  issuedDate  DateTime?           @map("issued_date")
  expiryDate  DateTime?           @map("expiry_date")
  issued      Boolean             @default(false)  // for HOW_TO_RENT
  version     String?
  aiExtracted Boolean             @default(false) @map("ai_extracted")
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")
  @@unique([propertyId, type])
  @@map("compliance_docs")
}

// ── Tenancy ───────────────────────────────────────────────────────────────────
// Note: tenantName/tenantEmail/tenantPhone removed — use tenant relation instead.
enum TenancyStatus { PENDING ACTIVE NOTICE_GIVEN ENDED }

model Tenancy {
  id                 String        @id @default(cuid())
  propertyId         String        @map("property_id")
  property           Property      @relation(...)
  tenantId           String?       @map("tenant_id")   // FK → Tenant
  tenant             Tenant?       @relation(...)
  startDate          DateTime?     @map("start_date")
  endDate            DateTime?     @map("end_date")
  monthlyRent        Int?          @map("monthly_rent")  // pence
  paymentDay         Int?          @map("payment_day")   // 1–31
  status             TenancyStatus @default(PENDING)
  depositAmount      Int?          @map("deposit_amount")        // pence
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
// PENDING  = upcoming, not yet due
// EXPECTED = due date reached, not yet confirmed received
// RECEIVED = landlord manually confirmed (sets receivedDate + receivedAmount)
// LATE     = past due date, not received
// PARTIAL  = partial amount received

model RentPayment {
  id             String        @id @default(uuid())
  tenancyId      String        @map("tenancy_id")
  tenancy        Tenancy       @relation(...)
  amount         Int           // expected pence
  dueDate        DateTime      @map("due_date")
  receivedDate   DateTime?     @map("received_date")
  receivedAmount Int?          @map("received_amount")  // pence (for partial payments)
  status         PaymentStatus @default(PENDING)
  note           String?
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")
  @@map("rent_payments")
}

// ── Tenant ────────────────────────────────────────────────────────────────────
// Separate from Tenancy — represents the person, not the rental agreement.
// One user can be both a landlord (User) and a tenant (Tenant record).
enum TenantStatus { CANDIDATE INVITED TENANT FORMER_TENANT }

model Tenant {
  id          String       @id @default(uuid())
  userId      String?      @map("user_id")     // linked once they sign in via magic link
  user        User?        @relation(...)
  propertyId  String       @map("property_id")
  property    Property     @relation(...)
  name        String
  email       String
  phone       String?
  status      TenantStatus @default(INVITED)
  inviteToken String       @unique @map("invite_token") @default(uuid())  // public URL token
  confirmedAt DateTime?    @map("confirmed_at")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  tenancies           Tenancy[]
  documents           TenantDocument[]
  acknowledgments     DocumentAcknowledgment[]
  maintenanceRequests MaintenanceRequest[]
  financialReports    FinancialReport[]
  @@map("tenants")
}

// ── TenantDocument ────────────────────────────────────────────────────────────
// Documents uploaded by or for a specific tenant (e.g. passport, R2R check).
// Stored in the 'tenant-documents' Supabase Storage bucket.
enum TenantDocumentType {
  PASSPORT RIGHT_TO_RENT PROOF_OF_INCOME BANK_STATEMENTS
  EMPLOYER_REFERENCE PREVIOUS_LANDLORD_REFERENCE
  GUARANTOR_AGREEMENT PET_AGREEMENT OTHER
}

model TenantDocument {
  id           String             @id @default(uuid())
  tenantId     String             @map("tenant_id")
  tenant       Tenant             @relation(...)
  documentType TenantDocumentType @map("document_type")
  fileName     String             @map("file_name")
  fileUrl      String             @map("file_url")   // Supabase Storage path
  fileSize     Int                @map("file_size")  // bytes
  mimeType     String             @map("mime_type")
  uploadedBy   String             @map("uploaded_by")  // Supabase user.id
  uploadedAt   DateTime           @default(now()) @map("uploaded_at")
  expiryDate   DateTime?          @map("expiry_date")  // R2R and Passport only
  note         String?
  @@map("tenant_documents")
}

// ── PropertyDocument ──────────────────────────────────────────────────────────
// Full document management system (14 types, Supabase Storage, signed URLs).
enum DocumentType {
  GAS_SAFETY EPC EICR HOW_TO_RENT TENANCY_AGREEMENT INVENTORY_REPORT
  DEPOSIT_CERTIFICATE RIGHT_TO_RENT BUILDING_INSURANCE LANDLORD_INSURANCE
  SECTION_13_NOTICE SECTION_8_NOTICE CHECKOUT_INVENTORY OTHER
}

model PropertyDocument {
  id           String       @id @default(uuid())
  propertyId   String       @map("property_id")
  property     Property     @relation(...)
  documentType DocumentType @map("document_type")
  fileName     String       @map("file_name")
  fileUrl      String       @map("file_url")   // Supabase Storage path
  fileSize     Int          @map("file_size")  // bytes
  mimeType     String       @map("mime_type")
  uploadedAt   DateTime     @default(now()) @map("uploaded_at")
  expiryDate   DateTime?    @map("expiry_date")
  acknowledgments DocumentAcknowledgment[]
  @@map("property_documents")
}

model DocumentAcknowledgment {
  id             String           @id @default(uuid())
  documentId     String           @map("document_id")
  document       PropertyDocument @relation(...)
  tenantId       String           @map("tenant_id")
  tenant         Tenant           @relation(...)
  acknowledgedAt DateTime         @default(now()) @map("acknowledged_at")
  @@unique([documentId, tenantId])
  @@map("document_acknowledgments")
}

// ── MaintenanceRequest ─────────────────────────────────────────────────────────
enum MaintenanceStatus   { OPEN IN_PROGRESS RESOLVED }
enum MaintenancePriority { LOW MEDIUM HIGH URGENT }

model MaintenanceRequest {
  id             String              @id @default(uuid())
  propertyId     String              @map("property_id")
  property       Property            @relation(...)
  tenantId       String              @map("tenant_id")
  tenant         Tenant              @relation(...)
  title          String
  description    String
  priority       MaintenancePriority @default(MEDIUM)
  status         MaintenanceStatus   @default(OPEN)
  inProgressAt   DateTime?           @map("in_progress_at")
  resolvedAt     DateTime?           @map("resolved_at")
  resolvedBy     String?             @map("resolved_by")
  createdAt      DateTime            @default(now()) @map("created_at")
  updatedAt      DateTime            @updatedAt @map("updated_at")
  statusHistory  MaintenanceStatusHistory[]
  photos         MaintenancePhoto[]
  @@map("maintenance_requests")
}

model MaintenanceStatusHistory {
  id         String              @id @default(uuid())
  requestId  String              @map("request_id")
  request    MaintenanceRequest  @relation(...)
  fromStatus MaintenanceStatus?  @map("from_status")
  toStatus   MaintenanceStatus   @map("to_status")
  changedBy  String              @map("changed_by")
  changedAt  DateTime            @default(now()) @map("changed_at")
  note       String?
  @@map("maintenance_status_history")
}

model MaintenancePhoto {
  id         String             @id @default(uuid())
  requestId  String             @map("request_id")
  request    MaintenanceRequest @relation(...)
  uploadedBy String             @map("uploaded_by")
  role       String             // "TENANT" | "LANDLORD"
  fileUrl    String             @map("file_url")
  fileName   String             @map("file_name")
  fileSize   Int                @map("file_size")
  uploadedAt DateTime           @default(now()) @map("uploaded_at")
  caption    String?
  @@map("maintenance_photos")
}

// ── Financial Scoring ──────────────────────────────────────────────────────────
enum ScoringCategory { AFFORDABILITY STABILITY DEBT GAMBLING LIQUIDITY POSITIVE }
enum ReportType      { LANDLORD_REQUESTED SELF_REQUESTED }
enum ReportStatus    { PENDING PROCESSING COMPLETED FAILED }

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

model FinancialReport {
  id                   String       @id @default(uuid())
  tenantId             String?      @map("tenant_id")
  tenant               Tenant?      @relation(...)
  propertyId           String?      @map("property_id")
  property             Property?    @relation(...)
  reportType           ReportType   @map("report_type")
  status               ReportStatus @default(PENDING)
  scoringConfigVersion Int          @map("scoring_config_version")
  totalScore           Int?         @map("total_score")
  grade                String?      // Excellent / Good / Fair / Poor / High Risk
  aiSummary            String?      @map("ai_summary")
  breakdown            Json?        // score by category
  appliedRules         Json?        @map("applied_rules")
  verificationToken    String       @unique @default(uuid()) @map("verification_token")
  pdfUrl               String?      @map("pdf_url")
  statementFileUrl     String?      @map("statement_file_url")
  createdAt            DateTime     @default(now()) @map("created_at")
  updatedAt            DateTime     @updatedAt @map("updated_at")
  @@map("financial_reports")
}
```

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

# Build & Deploy
npm run build            # Production build
npm run lint             # ESLint check
npx tsc --noEmit         # TypeScript check (there is no npm run type-check script)
```

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

### Components
- Server Components by default, `"use client"` only when necessary
- Form state with `react-hook-form` + `zod` resolver
- Loading states with `Suspense` boundaries, not manual `isLoading`
- Zod version is **v4** — use `error:` not `errorMap:` for custom messages

### Shared Components
- `components/shared/DocumentUploadModal.tsx` — reusable drag-and-drop upload modal
  - Props: `isOpen`, `onClose`, `onUploaded`, `uploadEndpoint`, `extraFields`, `documentTypes`, `expiryDateTypes?`, `preselectedType?`, `title?`
  - Used for both property documents (`/api/documents/upload`) and tenant documents (`/api/tenant-documents/upload`)
  - `extraFields` passes `{ propertyId }` or `{ tenantId }` to the endpoint

### AI Calls
- Claude API calls go through `lib/scoring/engine.ts` (direct `fetch` to `https://api.anthropic.com/v1/messages`)
- Model: `claude-sonnet-4-20250514`
- Currently used for: bank statement financial analysis (scoring engine)
- Never expose raw AI output to users — always parse and validate

### Supabase Storage
- `lib/storage.ts` — general helpers (uploadFile, getSignedUrl, deleteFile), optional `bucket` param (defaults to `'documents'`)
- `lib/maintenance-storage.ts` — dedicated helpers for maintenance photos (uploadMaintenancePhoto, getMaintenancePhotoUrl, deleteMaintenancePhoto)
- Four private buckets (auto-created on first upload):
  - `documents` — property-level documents (PropertyDocument model)
  - `tenant-documents` — tenant-level documents (TenantDocument model)
  - `maintenance-photos` — maintenance request photos (MaintenancePhoto model)
  - `bank-statements` — uploaded bank statement PDFs (FinancialReport model)
- Storage path patterns:
  - Property docs: `/{userId}/{propertyId}/{documentId}/{filename}`
  - Tenant docs: `/{propertyId}/{tenantId}/{documentId}/{filename}`
  - Maintenance photos: `/{requestId}/{role}/{photoId}-{filename}`
  - Bank statements: `/{reportId}/{filename}`
- Always generate signed URLs (60 min expiry) — never expose raw storage paths

### Rent Payments
- `lib/payments.ts` has two helpers called on every payments page load:
  - `generateUpcomingPayments(tenancyId)` — creates RentPayment records for next 3 months (idempotent, skips existing)
  - `updatePaymentStatuses()` — transitions PENDING→EXPECTED (due today) and PENDING/EXPECTED→LATE (overdue)
- Landlord manually marks payments received with date, amount (supports partial), and optional note
- Statuses: PENDING (future) → EXPECTED (due today) → RECEIVED or LATE; PARTIAL for partial amounts

### Maintenance
- `MaintenanceRequest` has priority (URGENT/HIGH/MEDIUM/LOW) and status (OPEN/IN_PROGRESS/RESOLVED)
- `MaintenanceStatusHistory` is an immutable audit trail — all status changes logged with `changedBy` and optional note
- `MaintenancePhoto` supports upload by tenant or landlord, stored in `maintenance-photos` bucket
- Dashboard overview shows top 3 active requests (OPEN + IN_PROGRESS), sorted by priority then date
- `/dashboard/maintenance` lists all requests with status filter tabs

### Financial Scoring
- `lib/scoring/engine.ts` — AI-powered bank statement analysis via Claude API
- Flow: upload PDF → create FinancialReport (PENDING) → background `analyzeStatement()` → Claude returns fired rules → score calculated → COMPLETED
- Score starts at 100, rules add/subtract points. Grades: Excellent (85+), Good (70+), Fair (55+), Poor (40+), High Risk (<40)
- 30 scoring rules across 6 categories (AFFORDABILITY, STABILITY, DEBT, GAMBLING, LIQUIDITY, POSITIVE)
- Gambling rule deduplication: only the highest applicable gambling penalty is applied
- `prisma/seed-scoring.ts` — seed script for rules + ScoringConfig v1 (`npx tsx prisma/seed-scoring.ts`)
- `/verify/[token]` — public verification page for financial reports (token-based, no auth)

### Error Handling
- Use `try/catch` in all async server functions
- Log errors with `console.error` including context
- Return user-friendly messages, never expose stack traces

---

## Environment Variables

```env
# Database
DATABASE_URL=              # Supabase connection string (pooled, pgbouncer=true)
DIRECT_URL=                # Supabase direct connection (for migrations, port 5432)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email (Resend)
RESEND_API_KEY=            # Used by the app to send transactional email
                           # Also used as the Supabase SMTP password (see below)
                           # Optional in dev — falls back to console.log

# Address lookup
OS_API_KEY=                # OS Places API key (postcode → address lookup)

# Payments (not yet implemented)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI
ANTHROPIC_API_KEY=            # Used by scoring engine (lib/scoring/engine.ts) — optional

# App
NEXT_PUBLIC_APP_URL=       # e.g. https://letsorted.co.uk (required — used in invite/apply links)
CRON_SECRET=               # Secret for cron job endpoints (not yet implemented)
```

---

## Supabase SMTP → Resend Setup

Supabase Auth sends magic-link emails. Configure it to relay through Resend so
emails arrive from our domain and don't land in spam.

**Dashboard path:** Supabase → Authentication → Providers → Email → SMTP Settings

| Field | Value |
|---|---|
| Enable Custom SMTP | ✅ on |
| Sender name | `LetSorted` |
| Sender email | `auth@letsorted.co.uk` *(must be a verified domain in Resend)* |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | `[RESEND_API_KEY]` — the `re_...` key from the Resend dashboard |

**Resend side:**
1. Add and verify your sending domain in Resend → Domains (adds SPF/DKIM DNS records).
2. The same API key used for `RESEND_API_KEY` in `.env.local` doubles as the SMTP password — no separate credential needed.

**Testing:**
- Use Supabase → Authentication → Email Templates → "Send test email" after saving SMTP settings.
- Check Resend → Logs to confirm delivery.

---

## Important Business Rules

- **Free tier:** 1 property only. 2+ properties require paid subscription (£10/mo per property)
- **Paid one-time events:** Screening Pack £15, Contract £10, Inventory Report £5, Dispute Pack £29
- **All contracts generated are APT** (Assured Periodic Tenancy) — not AST (abolished May 2026)
- **Rent increases:** only once per year via Section 13 Notice — enforce this in UI
- **Awaab's Law:** DAMP_MOULD tickets automatically set `respondBy = createdAt + 24 hours`
- **Deposit deadline:** 30 days from tenancy start date — alert landlord if unprotected
- **Tenant notice period:** minimum 2 months — validate before allowing submission
- **Magic link only:** no password auth, no social login
- **Tenancy ↔ Tenant:** Tenancy is the rental agreement; Tenant is the person. They are linked via `tenantId` FK. Do not add contact fields to Tenancy — read from the Tenant relation.

## What NOT to Do

- Never store passwords — auth is magic link via Supabase
- Never generate legal text from scratch — AI fills pre-approved templates only
- Never expose Supabase service role key to the browser
- Never store monetary amounts as floats — always pence integers
- Never skip input validation on API routes
- Never use `prisma.$executeRaw` without parameterized queries
- Never add tenantName/tenantEmail/tenantPhone to Tenancy — those fields were removed; use the Tenant relation
