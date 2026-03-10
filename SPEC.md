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

### Screening — Subscriber (Invite Flow)
| Scenario | Price |
|----------|-------|
| First screening per tenancy cycle | £9.99 |
| Each additional candidate (same property, same cycle) | £1.49 |

Tenancy cycle resets when property returns to VACANT.

Cycle is per-property. First **unlock** in the cycle costs £9.99; each subsequent unlock in the same cycle costs £1.49. Cycle resets when the property returns to VACANT status. Invites sent and statements uploaded do not trigger payment — only unlocking a report does.

### Screening — Standalone (Credit Packs)
For landlords without a LetSorted subscription. Packs never expire, tied to account, balances accumulate on top-up.

| Pack | Price | Per check |
|------|-------|-----------|
| 1 check | £11.99 | £11.99 |
| 3 checks | £19.99 | £6.66 |
| 6 checks | £29.99 | £5.00 |
| 10 checks | £39.99 | £4.00 |

**Pack rules:**
- Packs never expire — use anytime
- Buying another pack adds to existing balance (no separate wallets)
- If a pack user later subscribes — unused pack credits are NOT converted or lost; subscriber pricing (£9.99/£1.49) simply takes precedence for future checks
- Each unlock consumes 1 credit. Subscribers with remaining pack credits are NOT charged from the pack — subscriber pricing (£9.99/£1.49) takes precedence.

**Standalone entry flow (from homepage):**
User clicks "Tenant Screening" → registers via OTP (email only, no property setup required) → selects pack → pays via Stripe → uploads bank statement → receives report → post-report prompt to upgrade to full subscription

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
- `OTPInput` component — 6-box auto-advance, paste support
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
| Tenant Portal Link | LIVE | Copyable + send by email on property detail |

### AI Financial Screening
| Feature | Status | Notes |
|---------|--------|-------|
| Screening Invite Flow | BETA | Primary flow — invite → upload → AI → unlock |
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
| Credit Pack Flow | LIVE | Standalone entry point for non-subscribers; packs never expire, balances accumulate |

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

### Tenant Portal
| Feature | Status | Notes |
|---------|--------|-------|
| Document Access + Upload | LIVE | View, acknowledge, upload own docs |
| Maintenance Submission | LIVE | With photos |
| Rent Payment View | LIVE | Read-only |
| Check-in Review | LIVE | Confirm/dispute, upload photos |
| Onboarding Checklist | LIVE | R2R, deposit, first rent, agreement |
| Notice Period | NOT STARTED | — |

### Tenancy Management
| Feature | Status | Notes |
|---------|--------|-------|
| Deposit Tracking | LIVE | Amount, scheme, protection status, 30-day alert |
| Check-in Reports | LIVE | See above |
| Contract Generation | NOT STARTED | APT template, Stripe payment |
| Section 13 Notices | NOT STARTED | Rent increase workflow |
| Section 8 Notices | NOT STARTED | Possession grounds |
| Check-out Inspection | NOT STARTED | Side-by-side comparison with check-in |

### Notifications & Alerts
| Feature | Status | Notes |
|---------|--------|-------|
| Email Templates | LIVE | 9 templates in `lib/email-templates/index.ts` |
| Notifications Registry | LIVE | Admin panel at `/admin/notifications` |
| Compliance Alerts Cron | LIVE | Daily 9am UTC |
| Maintenance Notifications | LIVE | New, status updates, Awaab's 4h reminder |
| Rent Reminders Cron | LIVE | Daily 8am UTC |
| Check-in Notifications | LIVE | Review request, response, PDF to both |

### SEO & Content
| Feature | Status | Notes |
|---------|--------|-------|
| Sitemap + Robots | LIVE | Dynamic |
| JSON-LD + OG Image | LIVE | — |
| Guides/Blog | LIVE | MDX, `/guides/[slug]` |
| Article Generator | LIVE | `npm run generate-article "topic"` |
| Feature Pages | LIVE | 5 marketing feature pages |

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

### Screening Flow
```
Landlord → enter emails + rent → invites sent
↓
Candidate → /screening/apply/[token] → upload bank statements
↓
AI: name verify (Haiku) → period validate → score 0–100 (Sonnet)
↓
Report locked → landlord notified → pays to unlock (MOCK_PAID)
↓
Select Tenant → winner email + rejections → Property ACTIVE
```

### Check-in Report Flow
```
Rooms configured → Landlord creates report
↓
Room-by-room: photos + condition + captions → Send to tenant
↓
Tenant: /tenant/check-in/[token] → reviews + adds own photos → confirms
↓
Landlord confirms → status AGREED → PDF generated
→ PDF (all photos attributed) + Gas Safety + EPC emailed to both
```

### Tenant Lifecycle
```
VACANT → Application Link → Applicant submits → CANDIDATE
↓
Landlord invites → INVITED → Tenant joins → TENANT
↓
Portal: docs, maintenance, rent, check-in
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
| Styling | Tailwind CSS + shadcn/ui (New York style) |
| Validation | Zod v4 — use `error:` not `errorMap:` |
| PDF | pdf-lib |

### Storage Buckets
| Bucket | Path Pattern | Contents |
|--------|-------------|----------|
| `documents` | `/{userId}/{propertyId}/{docId}/{filename}` | Property docs + check-in PDFs |
| `tenant-documents` | `/{propertyId}/{tenantId}/{docId}/{filename}` | Tenant docs |
| `maintenance-photos` | `/{requestId}/{role}/{photoId}-{filename}` | Maintenance photos |
| `bank-statements` | `/{reportId}/{filename}` | Screening PDFs |
| `check-in-photos` | `/{propertyId}/{reportId}/{roomId}/{photoId}-{filename}` | Check-in photos |

Check-in PDFs: `check-in-reports/{reportId}/check-in-report.pdf` (in `documents` bucket)
All URLs: signed, 60-minute expiry.

### AI Models
| Model | Used For |
|-------|---------|
| `claude-sonnet-4-20250514` | Financial analysis, article generation, update-docs |
| `claude-haiku-4-5-20251001` | Name verification (per-file, ~80% cost saving) |

### Key Files
| File | Purpose |
|------|---------|
| `lib/scoring/engine.ts` | AI financial analysis engine |
| `lib/check-in-pdf.ts` | Check-in PDF generation |
| `lib/check-in-storage.ts` | Check-in photo helpers |
| `lib/maintenance-storage.ts` | Maintenance photo helpers |
| `lib/image-utils.ts` | Resize/compress (shared by maintenance + check-in) |
| `lib/room-utils.ts` | Room type helpers, auto-suggest logic |
| `lib/payment-service.ts` | Mock Stripe |
| `lib/payments.ts` | Rent payment generation + status updates |
| `lib/screening-pricing.ts` | Screening pack definitions |
| `lib/email-templates/base.ts` | Base email template + helpers |
| `lib/email-templates/index.ts` | 9 email template functions |

---

## Compliance & Legal

### Renters' Rights Act 2025
- Effective 1 May 2026
- Section 21 abolished — possession via Section 8 grounds only
- All ASTs convert to APT (Assured Periodic Tenancy)
- Rent increases: once per year via Section 13 Notice only
- 15 new offences, fines up to £40,000

### Awaab's Law
- DAMP_MOULD maintenance sets `respondBy = createdAt + 24h`
- 4h-before reminder cron at `/api/cron/awaabs` (every 15 min)

### GDPR
- Check-in photos retained tenancy duration + 3 months, then eligible for deletion (cron not yet built)
- All files encrypted at rest, signed URLs 60-min expiry
- PostHog EU residency, Supabase UUID only (no PII)

---

## Business Rules

- Free tier: 1 property forever. 2+ = £9.99/month per additional
- All contracts generated are APT — never use AST language (abolished May 2026)
- Rent increases: once per year via Section 13 only
- Deposit protection: 30-day deadline, alert if unprotected
- Tenant notice: minimum 2 months
- Screening invite expiry: 7 days, lazily updated to EXPIRED on access
- Backward compat: reports with `screeningUsageId` (credit-pack) treated as unlocked
- Check-in PDF: only generated when BOTH `landlordConfirmedAt` + `tenantConfirmedAt` set
- PDF completeness: ALL photos (landlord + tenant) included — no selective inclusion
- Candidate screening view: never show grade labels or "/100"
- Photo upload: reuse maintenance pattern via props — never create duplicate components

---

## What NOT to Do

- Never use magic link auth — OTP only (magic links get pre-clicked by corporate scanners)
- Never store passwords
- Never generate legal text from scratch — AI fills pre-approved templates only
- Never expose Supabase service role key to browser
- Never store monetary amounts as floats — always pence integers
- Never skip input validation on API routes
- Never use `prisma.$executeRaw` without parameterised queries
- Never add contact fields to Tenancy — use the Tenant relation
- Never show grade labels or "/100" to candidates
- Never expose raw AI output — always `cleanSummary()`
- Never create new photo upload components — extend maintenance pattern via props
- Never generate check-in PDF unless both confirmations are set
