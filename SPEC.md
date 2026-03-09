# SPEC.md — Product Specification

## Product Vision & Target User

**LetSorted** (letsorted.co.uk) — Simple property management for UK self-managing landlords.

**Target:** 1–5 property landlords managing independently (~1.4M in UK). Currently using spreadsheets, folders, and WhatsApp.

**Core Value:** Complete tenant lifecycle management — applications, AI screening, documents, rent tracking, maintenance, check-in evidence reports, and RRA 2025 compliance in one clean interface.

**Positioning:** Only product combining landlord compliance + AI financial screening + dual-confirmation check-in evidence system + tenant portal designed specifically for small-portfolio self-managers (not lettings agents).

---

## Pricing Model

### Subscription
- **1 property: FREE forever** (acquisition)
- **2+ properties: £9.99/month per additional property**

### Screening — Invite Flow (primary)
| Scenario | Price |
|----------|-------|
| First screening per tenancy cycle (subscriber) | £9.99 |
| Each additional candidate (same property cycle) | £1.49 |
| Standalone (no subscription) | £11.99 |

### Pay-Per-Use (future)
| Feature | Price | Status |
|---------|-------|--------|
| APT Contract Generation | £10 | NOT STARTED |
| Inventory Report PDF | £5 | NOT STARTED |
| Dispute Evidence Pack | £29 | NOT STARTED |

**Payment: Stripe NOT YET INTEGRATED.** All purchases use MOCK_PAID flow via `lib/payment-service.ts`.

---

## Auth

- **Method:** Supabase Auth — **6-digit OTP code** (not magic link)
- No passwords, no social login
- OTP sent by email, 45s resend cooldown, `lib/supabase/otp.ts`
- OTP handling in `(auth)/login/page.tsx` (landlords) and `(tenant)/passport/page.tsx` (tenants)
- **Why not magic link:** corporate email security (Outlook/Google) pre-clicks links, invalidating tokens before user sees them

---

## Feature List with Status

### Core Platform
| Feature | Status | Notes |
|---------|--------|-------|
| OTP Auth (Supabase) | LIVE | 6-digit code |
| Demo Login Buttons | LIVE | Env-var gated |
| Property Management | LIVE | Address, type, bedrooms, status |
| Property Rooms Setup | LIVE | Wizard Step 2; used by check-in reports |
| Onboarding Wizard | LIVE | 5 steps: Address → Rooms → Occupancy → Tenant → Done |
| Name Capture Modal | LIVE | Undismissable on first login if no name |
| Settings Page | LIVE | Display name edit |
| Admin Panel | LIVE | Cookie-based auth, user/property CRUD, notifications registry |

### Tenant Pipeline
| Feature | Status | Notes |
|---------|--------|-------|
| Public Application Form | LIVE | `/apply/[propertyId]` |
| Multi-email Invite UI | LIVE | Up to 10 emails, cost counter, preview modal |
| Tenant Status Pipeline | LIVE | CANDIDATE → INVITED → TENANT → FORMER_TENANT |
| Tenant Onboarding | LIVE | `/tenant/join/[token]` |
| Select Tenant Flow | LIVE | Winner email + rejections to others, Property → ACTIVE |
| Tenant Portal Dashboard | LIVE | Document access, maintenance, rent view |

### AI Financial Screening
| Feature | Status | Notes |
|---------|--------|-------|
| Screening Invite Flow | LIVE | Primary flow — invite → upload → AI → unlock |
| Joint Application | LIVE | Income summed as household |
| AI Scoring Engine | LIVE | 32 rules, 6 categories, 0–100 score (Sonnet) |
| Name Verification | LIVE | Per-file Claude Haiku call |
| Period Validation | LIVE | ≥60 days coverage, ≤6 months old |
| Server-side Validation | LIVE | RENT_ABOVE_40_PCT + threshold rules |
| Director's Loan Exclusion | LIVE | Excluded from debt calc |
| Deduplication | LIVE | Gambling + income discrepancy (highest penalty only) |
| Report Unlock | MOCK | MOCK_PAID — no real Stripe |
| Verification Pages | LIVE | Public `/verify/[token]` |
| Candidate View | LIVE | Neutral reliability score, no grade/"/100" |
| Credit Pack Flow | LIVE | Still functional, invite flow is primary |

### Document Management
| Feature | Status | Notes |
|---------|--------|-------|
| Property Documents | LIVE | 14 types, expiry tracking, drag-drop |
| Tenant Documents | LIVE | 9 types, upload by both parties |
| Document Acknowledgment | LIVE | Tenant marks as reviewed |
| Compliance Dashboard | LIVE | Gas/EPC/EICR/H2R status cards |

### Financial Management
| Feature | Status | Notes |
|---------|--------|-------|
| Rent Payment Tracking | LIVE | Manual landlord entry |
| Payment Status Pipeline | LIVE | PENDING → EXPECTED → RECEIVED/LATE/PARTIAL |
| Auto-generate Payments | LIVE | Next 3 months on page load (idempotent) |
| Stripe Subscriptions | NOT STARTED | Mock flow in place |
| GoCardless | NOT STARTED | — |

### Maintenance
| Feature | Status | Notes |
|---------|--------|-------|
| Maintenance Requests | LIVE | Tenant submission + landlord management |
| Photo Upload | LIVE | Both parties, resize/compress |
| Priority + Status | LIVE | URGENT/HIGH/MEDIUM/LOW, immutable audit trail |
| Awaab's Law Timer | LIVE | DAMP_MOULD → respondBy + 24h, 4h cron reminder |

### Check-in Reports
| Feature | Status | Notes |
|---------|--------|-------|
| Report Creation | LIVE | Room-by-room photos, condition tags, captions |
| Tenant Review Page | LIVE | Token-based, no portal login needed |
| Tenant Photo Upload | LIVE | Condition + comment per photo |
| Dual Confirmation | LIVE | Both must confirm before PDF generated |
| PDF Generation | LIVE | All photos from both parties, attributed |
| DISPUTED Status | LIVE | All photos included regardless |
| Move-in Email | LIVE | PDF + Gas Safety + EPC on AGREED |
| Status Machine | LIVE | DRAFT → PENDING → IN_REVIEW → AGREED/DISPUTED |
| GDPR Retention | NOTED | Deletion cron not yet built |

### Notifications & Alerts
| Feature | Status | Notes |
|---------|--------|-------|
| Email Templates | LIVE | 9 templates in `lib/email-templates/index.ts` |
| Notifications Registry | LIVE | Admin panel at `/admin/notifications` |
| Compliance Alerts Cron | LIVE | Daily 9am UTC |
| Maintenance Notifications | LIVE | New, status updates, Awaab's 4h reminder |
| Rent Reminders Cron | LIVE | Daily 8am UTC |
| Check-in Notifications | LIVE | Review request, response, PDF to both |

### Marketing & SEO
| Feature | Status | Notes |
|---------|--------|-------|
| Sitemap + Robots | LIVE | Dynamic |
| JSON-LD + OG Image | LIVE | — |
| Guides/Blog | LIVE | MDX, `/guides/[slug]` |
| Article Generator | LIVE | `scripts/generate-article.ts` |
| Feature Pages | LIVE | 5 marketing feature pages |
| Renters' Rights Act Page | LIVE | `/renters-rights-act` with Crisp chat |

### Analytics & Monitoring
| Feature | Status | Notes |
|---------|--------|-------|
| Google Analytics | LIVE | Consent-gated |
| Microsoft Clarity | LIVE | Consent-gated |
| Facebook Pixel | LIVE | Consent-gated |
| Cookie Consent | LIVE | vanilla-cookieconsent |
| Sentry | LIVE | Client + server + edge |
| PostHog | LIVE | EU residency, consent-gated |

---

## User Flows

### Landlord Onboarding
```
Email → 6-digit OTP → Name Modal → Dashboard
↓
Wizard: Address + Type → Rooms → Occupancy → Tenant → Done
↓
Upload Compliance Docs → Status Cards Update
```

### Screening Flow (Primary)
```
Property page → Invite Applicants → Enter emails + rent
↓
Candidates receive invitation → /screening/apply/[token]
↓
Upload bank statements → AI processing (name verify + analysis)
↓
Report locked → landlord pays to unlock (MOCK_PAID)
↓
Select Tenant → winner email + rejections → Property ACTIVE
```

### Check-in Report Flow
```
Property ACTIVE → Create Check-in Report → Room setup required
↓
Landlord: Room-by-room photos + conditions → Send to Tenant
↓
Tenant: /check-in/[token] → Review + add own photos → Confirm
↓
Landlord confirms → Status AGREED → PDF generated
→ PDF (all photos) + Gas Safety + EPC emailed to both
```

### Tenant Journey
```
Application → CANDIDATE status → Landlord screening
↓
Selected → INVITED → Join link → TENANT status
↓
Portal access: Documents, maintenance, rent, check-in
```

---

## Technical Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 5.22 |
| Auth | Supabase Auth (OTP — 6-digit code) |
| Storage | Supabase Storage (5 private buckets) |
| Email | Resend (`lib/resend.ts`, console fallback in dev) |
| Payments | Stripe (NOT INTEGRATED — mock via `lib/payment-service.ts`) |
| AI | Claude Sonnet (analysis), Claude Haiku (name verify) |
| Live Chat | Crisp |
| Hosting | Vercel |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod v4 |
| PDF | pdf-lib |

### Database Schema
- **Users:** Supabase auth.users mirror with Stripe + subscription fields
- **Properties:** Type, status, rooms, compliance docs
- **Tenants:** Status pipeline, confirmation tokens, onboarding state
- **Tenancies:** Rent, deposit, payment tracking
- **Maintenance:** Awaab's Law timers, photo upload, status audit
- **Screening:** Invites, reports, AI scores, package credits
- **Check-in:** Room photos, dual confirmation, PDF generation

Key migrations in `supabase/migrations/` — 30 files from core schema to screening logs.

### Storage Buckets
| Bucket | Path Pattern | Contents |
|--------|-------------|----------|
| `documents` | `/{userId}/{propertyId}/{docId}/{filename}` | Property docs + check-in PDFs |
| `tenant-documents` | `/{propertyId}/{tenantId}/{docId}/{filename}` | Tenant docs |
| `maintenance-photos` | `/{requestId}/{role}/{photoId}-{filename}` | Maintenance photos |
| `bank-statements` | `/{reportId}/{filename}` | Screening PDFs |
| `check-in-photos` | `/{propertyId}/{reportId}/{roomId}/{photoId}-{filename}` | Check-in photos |

All URLs signed with 60-minute expiry.

### AI Models
| Model | Used For | Location |
|-------|---------|----------|
| `claude-3-5-sonnet-20241022` | Financial analysis, scoring | `lib/scoring/engine.ts` |
| `claude-3-5-haiku-20241022` | Name verification | Per-file validation |

### Key Components
| Component | Path | Purpose |
|-----------|------|---------|
| `ScreeningReportDisplay` | `components/shared/` | Unified report UI (landlord + candidate) |
| `ScoringProgressScreen` | `components/shared/` | AI processing progress |
| `DocumentUploadModal` | `components/shared/` | Drag-drop file upload |
| `TenantDetailsForm` | `components/shared/` | Tenant info collection |
| `PaymentSetupModal` | `components/shared/` | Mock Stripe card setup |

### Cron Jobs
| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/compliance` | Daily 9am UTC | Gas/EPC/deposit alerts |
| `/api/cron/rent-reminders` | Daily 8am UTC | Overdue payment notifications |
| `/api/cron/awaabs` | Every 15 min | Damp/mould 4h reminders |

---

## Compliance & Legal

### Renters' Rights Act 2025
- **Effective:** 1 May 2026
- **Key Changes:**
  - Section 21 abolished — possession via Section 8 grounds only
  - All ASTs convert to APT (Assured Periodic Tenancy)
  - Rent increases: once per year via Section 13 Notice only
  - 15 new offences, fines up to £40,000
- **Marketing:** Dedicated `/renters-rights-act` page with Crisp chat

### Awaab's Law
- **DAMP_MOULD** category in maintenance sets `respondBy = createdAt + 24h`
- Cron reminder 4h before deadline (`/api/cron/awaabs`)
- Auto-escalation via email notifications

### GDPR
- Check-in photos retained tenancy duration + 3 months (deletion cron pending)
- All files encrypted at rest, signed URLs with 60-min expiry
- PostHog EU residency, Supabase UUID only (no PII)
- Cookie consent via vanilla-cookieconsent

---

## Business Rules

### Pricing
- Free tier: 1 property forever
- 2+ properties: £9.99/month per additional property
- Screening: £9.99 first per cycle, £1.49 additional candidates

### Tenancy
- All contracts generated as APT (never AST — abolished May 2026)
- Rent increases: once per year via Section 13 only
- Deposit protection: 30-day deadline with alerts
- Tenant notice: minimum 2 months

### Screening
- Invite expiry: 7 days (lazily updated to EXPIRED)
- Backward compatibility: credit-pack reports (`screeningUsageId`) treated as unlocked
- Candidate view: never show grades or "/100" scores

### Check-in Reports
- PDF generated only when BOTH confirmations set
- ALL photos included (landlord + tenant) — no selective inclusion
- Status flow: DRAFT → PENDING → IN_REVIEW → AGREED/DISPUTED

---

## What NOT to Do

- **Never use magic link auth** — OTP only (magic links get pre-clicked by corporate scanners)
- **Never store passwords** — OTP-based auth only
- **Never generate legal text from scratch** — AI fills pre-approved templates only
- **Never expose Supabase service role key** to browser
- **Never store monetary amounts as floats** — always pence integers
- **Never skip input validation** on API routes
- **Never show grade labels or "/100"** to screening candidates
- **Never create new photo upload components** — extend existing patterns via props
- **Never generate check-in PDF** unless both confirmations are set
- **Never use `prisma.$executeRaw`** without parameterised queries