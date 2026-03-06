# CLAUDE.md — Project Instructions

## Project Overview

**LetSorted** (letsorted.co.uk) — UK property management SaaS for self-managing landlords (1–5 properties). Simple, practical tools: document management, tenant pipeline, rent tracking, compliance alerts, AI-powered financial screening. Renters' Rights Act 2025 compliance built in. Read `SPEC.md` for full product specification and `TASKS.md` for current sprint tasks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 5.22 |
| Auth | Supabase Auth (magic link only — no passwords) |
| Storage | Supabase Storage (4 private buckets) |
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
│   ├── (auth)/login/                   # Magic link login page
│   │
│   ├── (dashboard)/                    # Protected landlord dashboard
│   │   ├── layout.tsx                  # DashboardShell + NameModalGate wrapper
│   │   └── dashboard/
│   │       ├── page.tsx                # Overview: property cards, maintenance preview, compliance alerts
│   │       ├── onboarding/page.tsx     # First-run wizard (4 steps: property → occupancy → tenant → done)
│   │       ├── settings/page.tsx       # Profile settings: display name, email (read-only)
│   │       ├── maintenance/
│   │       │   ├── page.tsx            # Maintenance list: status tabs + priority sort
│   │       │   └── [id]/page.tsx       # Maintenance detail: status mgmt, photos, timeline
│   │       └── properties/
│   │           ├── page.tsx            # Properties list + compliance alert bar
│   │           ├── new/page.tsx        # Add property wizard (3 steps)
│   │           └── [id]/
│   │               ├── page.tsx        # Property detail: docs, tenants, applications, scoring
│   │               └── tenant/[tenantId]/
│   │                   ├── page.tsx    # Tenant detail (server component)
│   │                   └── client.tsx  # Tenant detail (client: R2R, docs, inline edit)
│   │
│   ├── (marketing)/                    # Public marketing site
│   │   ├── layout.tsx                  # Marketing layout + CrispChat widget
│   │   ├── page.tsx                    # Landing page + waitlist + closed beta modal
│   │   ├── features/                   # Features marketing pages
│   │   ├── renters-rights-act/         # Renters' Rights Act information
│   │   ├── privacy/                    # Privacy policy
│   │   ├── terms/                      # Terms of service
│   │   ├── verify/[token]/             # Public financial report verification (token-based)
│   │   └── screening/                  # Financial screening product
│   │       ├── page.tsx                # Invite form: send financial check to candidate
│   │       ├── sent/page.tsx           # Confirmation: "Invite sent to {email}"
│   │       ├── apply/[token]/page.tsx  # Candidate flow: upload PDFs, get score (public, no auth)
│   │       ├── report/[inviteId]/page.tsx  # Landlord report view (locked/unlocked)
│   │       ├── invites/page.tsx        # Invite history list (auth required)
│   │       ├── packages/page.tsx       # Credit pack pricing cards
│   │       └── use/page.tsx            # Redirects to /screening
│   │
│   ├── (tenant)/                       # Tenant-facing pages
│   │   ├── layout.tsx
│   │   ├── apply/[propertyId]/page.tsx # Application form (public, no auth)
│   │   ├── passport/page.tsx           # Financial Passport landing (pre-launch email capture)
│   │   └── tenant/
│   │       ├── join/[token]/page.tsx   # Tenant onboarding / confirm details
│   │       └── dashboard/
│   │           ├── page.tsx            # Tenant portal (server: auth gate)
│   │           └── client.tsx          # Tenant portal (client: property, docs, rent, maintenance)
│   │
│   ├── auth/callback/                  # Supabase magic-link callback (supports ?next= redirect)
│   │
│   └── api/                            # All return { data, error } shape
│       ├── address/                    # GET: OS Places postcode lookup
│       ├── admin/
│       │   ├── auth/                   # POST: admin login (username/password → cookie)
│       │   ├── properties/             # GET: list all properties (admin)
│       │   ├── properties/[id]/        # GET/PATCH/DELETE: admin property management
│       │   ├── users/                  # GET: list all users (admin)
│       │   └── users/[id]/             # GET/PATCH/DELETE: admin user management
│       ├── documents/
│       │   ├── route.ts                # GET: list PropertyDocuments for a property
│       │   ├── upload/                 # POST: multipart upload → storage + DB
│       │   └── [id]/
│       │       ├── route.ts            # GET: signed URL; DELETE: remove
│       │       └── acknowledge/        # POST: tenant marks document as reviewed
│       ├── maintenance/
│       │   ├── route.ts                # GET: list requests; POST: create request
│       │   └── [id]/
│       │       ├── route.ts            # GET: detail; PATCH: update status/priority
│       │       └── photos/
│       │           ├── route.ts        # GET: list; POST: upload photo
│       │           └── [photoId]/      # DELETE: remove photo
│       ├── payments/
│       │   ├── route.ts                # GET: list RentPayments for property
│       │   └── [id]/route.ts           # PATCH: mark received (date, amount, note)
│       ├── properties/
│       │   ├── route.ts                # GET: list; POST: create + seed ComplianceDocs
│       │   └── [id]/route.ts           # GET: with relations; PATCH: update settings
│       ├── scoring/
│       │   ├── upload/route.ts         # POST: upload PDFs, create report, trigger analysis
│       │   └── [reportId]/
│       │       ├── route.ts            # GET: report status/results; POST: re-trigger analysis
│       │       └── declarations/       # POST: update applicant declarations on report
│       ├── screening/
│       │   ├── invite/route.ts         # POST: create invite + send candidate email
│       │   ├── invites/route.ts        # GET: list landlord's invites
│       │   ├── invite/[token]/route.ts # GET: load invite by token (public)
│       │   ├── invite/[token]/started/ # POST: mark invite PENDING→STARTED
│       │   ├── invite/[token]/submit/  # POST: candidate uploads PDFs + triggers analysis
│       │   ├── report/[inviteId]/unlock/ # POST: set isLocked=false (MOCK_PAID in beta)
│       │   ├── credits/route.ts        # GET: landlord's available screening credits
│       │   ├── history/route.ts        # GET: landlord's screening history
│       │   ├── purchase/route.ts       # POST: buy screening credit pack (MOCK_PAID)
│       │   └── upload/route.ts         # POST: credit-pack flow upload (legacy)
│       ├── tenancies/route.ts          # POST: create tenancy + Tenant in $transaction
│       ├── tenant/
│       │   ├── apply/route.ts          # POST: submit application (creates CANDIDATE Tenant)
│       │   ├── apply/property/[propertyId]/ # GET: public property info for apply form
│       │   ├── application-link-email/ # POST: email application link to address
│       │   ├── join/[token]/           # GET: load invite; POST: confirm + send magic link
│       │   └── send-invite/            # POST: (re)send invite email to tenant
│       ├── tenant-documents/
│       │   ├── route.ts                # GET: list TenantDocuments
│       │   ├── upload/                 # POST: multipart upload
│       │   └── [id]/route.ts           # GET: signed URL; DELETE: owner only
│       ├── tenants/[id]/route.ts       # PATCH: update tenant details (property owner only)
│       ├── user/profile/route.ts       # GET: user profile; PATCH: update display name
│       └── waitlist/route.ts           # POST: add email to waitlist
│
├── components/
│   ├── dashboard/
│   │   ├── shell.tsx                   # DashboardShell: sidebar, mobile drawer, context switcher
│   │   ├── NameModal.tsx               # Undismissable name capture modal for new landlords
│   │   └── NameModalGate.tsx           # Client wrapper: shows NameModal if needsName=true
│   └── shared/
│       ├── CrispChat.tsx               # Crisp live chat widget (client component)
│       ├── DocumentUploadModal.tsx      # Reusable drag-and-drop upload modal
│       ├── Footer.tsx                  # Shared footer (marketing + dashboard variants)
│       ├── ScoringProgressScreen.tsx    # Animated scoring progress with polling
│       ├── ScreeningReportDisplay.tsx   # Reusable report renderer (locked/unlocked states)
│       └── TenantDetailsForm.tsx        # Shared tenant details form (admin + landlord)
│
├── lib/
│   ├── admin-auth.ts                   # verifyAdminSession() — cookie-based admin auth check
│   ├── env.ts                          # Zod-validated env vars (server-only)
│   ├── email-templates/
│   │   ├── base.ts                     # Unified email base: baseEmailTemplate, ctaButton, infoBox, etc.
│   │   └── index.ts                    # All 6 email template functions + re-exports base helpers
│   ├── maintenance-storage.ts          # Supabase Storage helpers for maintenance-photos bucket
│   ├── os-places.ts                    # OS Places API (postcode → address lookup)
│   ├── payments.ts                     # generateUpcomingPayments, updatePaymentStatuses
│   ├── prisma.ts                       # Prisma client singleton
│   ├── resend.ts                       # Resend email client (console fallback if no API key)
│   ├── screening-pricing.ts            # STANDALONE_PACKAGES + SUBSCRIBER_PRICING constants
│   ├── scoring/
│   │   ├── engine.ts                   # AI scoring engine: multi-file analysis, name verification
│   │   └── index.ts                    # Barrel export: analyzeStatement
│   ├── storage.ts                      # Supabase Storage: uploadFile, getSignedUrl, deleteFile
│   ├── utils.ts                        # Shared utilities (cn)
│   └── supabase/
│       ├── auth.ts                     # Cookie-based auth client (anon key, SSR)
│       ├── client.ts                   # Browser client factory (anon key)
│       └── server.ts                   # Server client factory (service role, bypasses RLS)
│
├── prisma/
│   ├── schema.prisma                   # Single source of truth for DB schema (21 models)
│   └── seed-scoring.ts                 # Seed: 32 scoring rules + ScoringConfig v1
│
├── supabase/
│   └── migrations/                     # 21 SQL migration files (20260302–20260322)
│
└── middleware.ts                        # Protects /dashboard/*, /tenant/dashboard, /admin/*
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
  complianceDocs      ComplianceDoc[]    // legacy — dashboard compliance dots
  tenants             Tenant[]
  documents           PropertyDocument[]
  maintenanceRequests MaintenanceRequest[]
  financialReports    FinancialReport[]
  @@map("properties")
}

// ── ComplianceDoc (legacy — dashboard compliance dots and alert bar) ──────────
enum ComplianceDocType   { GAS_SAFETY EPC EICR HOW_TO_RENT }
enum ComplianceDocStatus { MISSING VALID EXPIRING EXPIRED }

model ComplianceDoc {
  id, propertyId, type, status, fileUrl, issuedDate, expiryDate, issued, version, aiExtracted
  @@unique([propertyId, type])
  @@map("compliance_docs")
}

// ── Tenancy ───────────────────────────────────────────────────────────────────
// tenantName/tenantEmail/tenantPhone were REMOVED — use Tenant relation.
enum TenancyStatus { PENDING ACTIVE NOTICE_GIVEN ENDED }

model Tenancy {
  id, propertyId, tenantId?, startDate?, endDate?
  monthlyRent  Int?   @map("monthly_rent")  // pence
  paymentDay   Int?   @map("payment_day")   // 1–31
  status       TenancyStatus @default(PENDING)
  depositAmount, depositScheme, depositRef, depositProtected, depositProtectedAt
  portalToken  String? @unique  // tenant dashboard access token
  contractUrl  String?
  payments     RentPayment[]
  @@map("tenancies")
}

// ── RentPayment ───────────────────────────────────────────────────────────────
enum PaymentStatus { PENDING EXPECTED RECEIVED LATE PARTIAL }

model RentPayment {
  id, tenancyId, amount (pence), dueDate, receivedDate?, receivedAmount? (pence), status, note?
  @@map("rent_payments")
}

// ── Tenant ────────────────────────────────────────────────────────────────────
enum TenantStatus { CANDIDATE INVITED TENANT FORMER_TENANT }

model Tenant {
  id, userId?, propertyId, name, email, phone?, status, inviteToken (unique UUID), confirmedAt?
  tenancies, documents, acknowledgments, maintenanceRequests, financialReports
  @@map("tenants")
}

// ── Documents ─────────────────────────────────────────────────────────────────
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

model TenantDocument    { id, tenantId, documentType, fileName, fileUrl, fileSize, mimeType, uploadedBy, uploadedAt, expiryDate?, note? }
model PropertyDocument  { id, propertyId, documentType, fileName, fileUrl, fileSize, mimeType, uploadedAt, expiryDate?, acknowledgments[] }
model DocumentAcknowledgment { documentId, tenantId, acknowledgedAt @@unique([documentId, tenantId]) }

// ── Maintenance ───────────────────────────────────────────────────────────────
enum MaintenanceStatus   { OPEN IN_PROGRESS RESOLVED }
enum MaintenancePriority { LOW MEDIUM HIGH URGENT }

model MaintenanceRequest { id, propertyId, tenantId, title, description, priority, status, inProgressAt?, resolvedAt?, resolvedBy?, statusHistory[], photos[] }
model MaintenanceStatusHistory { requestId, fromStatus?, toStatus, changedBy, changedAt, note? }
model MaintenancePhoto { requestId, uploadedBy, role ("TENANT"|"LANDLORD"), fileUrl, fileName, fileSize, caption? }

// ── Financial Scoring ──────────────────────────────────────────────────────────
enum ScoringCategory { AFFORDABILITY STABILITY DEBT GAMBLING LIQUIDITY POSITIVE }
enum ReportType      { LANDLORD_REQUESTED SELF_REQUESTED }
enum ReportStatus    { PENDING PROCESSING COMPLETED FAILED }

model ScoringRule  { id, category, key (unique), description, points, isActive }
model ScoringConfig { id, version (unique), isActive }

model FinancialReport {
  id                   String       @id @default(uuid())
  tenantId             String?      // FK → Tenant (optional)
  propertyId           String?      // FK → Property (optional)
  reportType           ReportType
  status               ReportStatus @default(PENDING)
  scoringConfigVersion Int
  totalScore           Int?         // 0–100
  grade                String?      // Excellent / Good / Fair / Poor / High Risk
  aiSummary            String?      // Cleaned AI narrative (no chain-of-thought)
  breakdown            Json?        // { category: points } map
  appliedRules         Json?        // [{ key, description, points, category }]
  verificationToken    String       @unique @default(uuid())  // public verification URL
  pdfUrl               String?
  statementFiles       Json?        // Array of StatementFile objects (multi-file support)
  applicantName        String?      // Name for verification
  jointApplicants      Json?        // Joint application data
  hasUnverifiedFiles   Boolean      @default(false)
  verificationWarning  String?      // Name mismatch warning text
  declaredIncomePence  Int?         // Applicant's declared income for comparison
  validationResults    Json?        // Per-person period coverage validation
  failureReason        String?      // Human-readable failure message
  screeningUsageId     String?      @unique  // FK → ScreeningPackageUsage (credit-pack flow)
  inviteId             String?      // FK → ScreeningInvite (invite flow)
  isLocked             Boolean      @default(true)   // true = report details hidden until paid
  monthlyRentPence     Int?         // Rent for this specific check
  @@map("financial_reports")
}

// ── Screening Invites ─────────────────────────────────────────────────────────
enum ScreeningInviteStatus { PENDING STARTED COMPLETED PAID EXPIRED }

model ScreeningInvite {
  id               String                @id @default(uuid())
  landlordId       String                // FK → User
  candidateName    String
  candidateEmail   String
  propertyAddress  String
  monthlyRentPence Int
  status           ScreeningInviteStatus @default(PENDING)
  token            String                @unique @default(uuid())  // public URL token
  reports          FinancialReport[]
  @@map("screening_invites")
}

// ── Screening Packages (credit-pack flow) ────────────────────────────────────
enum ScreeningPackageType   { SINGLE TRIPLE SIXER TEN }
enum ScreeningPaymentStatus { PENDING MOCK_PAID PAID REFUNDED }

model ScreeningPackage {
  id, userId, packageType, totalCredits, usedCredits, pricePence, paymentStatus, stripeSessionId?
  usages ScreeningPackageUsage[]
  @@map("screening_packages")
}

model ScreeningPackageUsage {
  id, packageId, candidateName, monthlyRentPence
  report FinancialReport?
  @@map("screening_package_usages")
}
```

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Property management | LIVE | CRUD, compliance docs, document management |
| Tenant pipeline | LIVE | Apply → Candidate → Invited → Tenant lifecycle |
| Tenant portal | LIVE | Auth-protected, docs, rent, maintenance |
| Document management | LIVE | 14 types, drag-drop upload, signed URLs |
| Rent tracking | LIVE | Auto-generate payments, manual mark received |
| Maintenance requests | LIVE | Priority, status, photos, audit trail |
| Compliance alerts | LIVE | Dashboard dots, alert bar, expiry tracking |
| Financial screening (invite flow) | BETA | Landlord invites → candidate uploads → AI analysis |
| Financial screening (credit packs) | BETA | Buy packs, upload directly (legacy flow) |
| Screening report unlock | MOCK | isLocked=false (MOCK_PAID, no real Stripe yet) |
| Admin panel | LIVE | Cookie-based auth, user/property CRUD |
| Onboarding wizard | LIVE | 4-step first-run for new landlords |
| Name capture modal | LIVE | Undismissable modal for landlords with no name set |
| Settings page | LIVE | Display name edit |
| Financial Passport | PRE-LAUNCH | Email capture landing page only |
| Live chat (Crisp) | LIVE | Marketing pages only |
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
- `lib/email-templates/index.ts` — 6 email template functions

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
npx tsc --noEmit         # TypeScript check (no npm run type-check script)
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
- Admin routes use `verifyAdminSession()` from `lib/admin-auth.ts` (cookie-based, separate from Supabase)

### Components
- Server Components by default, `"use client"` only when necessary
- Form state with `react-hook-form` + `zod` resolver
- Loading states with `Suspense` boundaries, not manual `isLoading`
- Zod version is **v4** — use `error:` not `errorMap:` for custom messages

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

### Supabase Storage
- `lib/storage.ts` — general helpers (uploadFile, getSignedUrl, deleteFile), optional `bucket` param (defaults to `'documents'`)
- `lib/maintenance-storage.ts` — dedicated helpers for maintenance photos
- Four private buckets (auto-created on first upload):
  - `documents` — property-level documents
  - `tenant-documents` — tenant-level documents
  - `maintenance-photos` — maintenance request photos
  - `bank-statements` — uploaded bank statement PDFs
- Storage path patterns:
  - Property docs: `/{userId}/{propertyId}/{documentId}/{filename}`
  - Tenant docs: `/{propertyId}/{tenantId}/{documentId}/{filename}`
  - Maintenance photos: `/{requestId}/{role}/{photoId}-{filename}`
  - Bank statements: `/{reportId}/{filename}`
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
                           # Also used as Supabase SMTP password (see below)

# Address lookup
OS_API_KEY=                # OS Places API key (postcode → address lookup)

# AI
ANTHROPIC_API_KEY=         # Used by scoring engine — optional

# App
NEXT_PUBLIC_APP_URL=       # e.g. https://letsorted.co.uk (used in invite/apply links)

# Admin panel
ADMIN_USERNAME=            # Optional — for /admin login
ADMIN_PASSWORD=            # Optional — for /admin login

# Live Chat
NEXT_PUBLIC_CRISP_WEBSITE_ID=  # Optional — chat widget hidden if not set

# Payments (not yet integrated)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Supabase SMTP → Resend Setup

Supabase Auth sends magic-link emails. Configure it to relay through Resend:

**Dashboard path:** Supabase → Authentication → Providers → Email → SMTP Settings

| Field | Value |
|---|---|
| Enable Custom SMTP | on |
| Sender name | `LetSorted` |
| Sender email | `auth@letsorted.co.uk` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | `[RESEND_API_KEY]` |

---

## Middleware

`middleware.ts` handles three auth guards:
1. **Dashboard**: `/dashboard/*` — redirects to `/login` if no Supabase user
2. **Tenant portal**: `/tenant/dashboard` — same redirect
3. **Admin panel**: `/admin/*` (except `/admin/login`) — checks `admin_session` cookie
4. **Login redirect**: `/login` → `/dashboard` if already authenticated

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
