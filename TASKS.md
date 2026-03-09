# TASKS.md — Product Backlog

Current product state and outstanding work. Updated March 2026.

Status: `[x]` done · `[-]` partially done / verify · `[ ]` todo · `[~]` deferred

---

## ✅ Completed — Core Platform

- [x] Next.js 14 App Router, TypeScript strict mode, Tailwind + shadcn/ui
- [x] Supabase project, Prisma schema, migrations workflow (supabase db push, not prisma migrate)
- [x] Environment variables via `lib/env.ts` (Zod v4 validated)
- [x] Vercel deployment
- [x] OTP Auth (6-digit code) — replaced magic link; `lib/supabase/otp.ts`, `OTPInput` component
- [x] Auth middleware protecting `/dashboard` and `/tenant/dashboard`
- [x] Dashboard layout with sidebar nav
- [x] Name capture modal (undismissable if no name set)
- [x] Settings page — display name edit
- [x] Admin panel — cookie-based auth, user/property CRUD, notifications registry
- [x] Row Level Security on all 15+ tables
- [x] Closed beta access gate (hardcoded code modal on landing page)
- [x] OS Places postcode lookup (`/api/address`, `lib/os-places.ts`)
- [x] 30 DB indexes across 17 models (migration `20260326_add_performance_indexes.sql`)
- [x] `update-docs` script — regenerates CLAUDE.md + SPEC.md via Claude API
- [x] Protected Notes section in CLAUDE.md survives doc regeneration

---

## ✅ Completed — Property Management

- [x] Add/view/manage properties — address, type, bedrooms, status
- [x] Property rooms model (`PropertyRoom`) — RoomType enum, name, floor, order
- [x] Onboarding wizard — 5 steps: Address → Rooms → Occupancy → Tenant → Done
- [x] Rooms auto-suggested from property type, drag-to-reorder, rename
- [x] Compliance cards (Gas/EPC/EICR/How to Rent) — status badges with dot indicators
- [x] Property documents — 14 types, drag-drop upload, expiry tracking, signed URLs, delete
- [x] Compliance cron — daily 9am UTC, 30d/7d/expired alerts + deposit protection reminders
- [-] Edit property (address fields) — verify if live

---

## ✅ Completed — Tenant Pipeline

- [x] Public application form `/apply/[propertyId]`
- [x] Tenant status pipeline: CANDIDATE → INVITED → TENANT → FORMER_TENANT
- [x] Multi-email invite UI (up to 10 emails, cost counter, `InvitePreviewModal`)
- [x] Pending invites list with status badges
- [x] Tenant join flow `/tenant/join/[token]`
- [x] Select Tenant — confirmation modal, winner email, rejection emails to all others, Property → ACTIVE
- [x] Tenant portal link — copyable + send by email on property detail

---

## ✅ Completed — AI Financial Screening

- [x] Screening invite flow (primary): invite → candidate uploads → AI analysis → landlord unlocks
- [x] Joint application toggle — income summed as household
- [x] AI scoring engine — 32 rules, 6 categories, score 0–100 (Sonnet)
- [x] Name verification per file (Haiku — cost optimisation)
- [x] Period validation (≥60 days coverage, ≤6 months old)
- [x] Server-side RENT_ABOVE_40_PCT + other threshold validations
- [x] Director's Loan exclusion from debt calculation
- [x] Gambling + income discrepancy deduplication (highest penalty only)
- [x] PDF compression + split (pdf-lib), JSON extraction safety
- [x] `cleanSummary()` strips chain-of-thought before DB save
- [x] Candidate view — neutral "reliability score" only
- [x] Public verification pages `/verify/[token]`
- [x] Report unlock (MOCK_PAID — Stripe not yet integrated)
- [x] Credit pack flow (legacy, still functional)
- [x] Seed script: `npx tsx prisma/seed-scoring.ts`

---

## ✅ Completed — Documents, Rent, Maintenance

- [x] Property documents (14 types) + tenant documents (9 types)
- [x] Document acknowledgment — tenant marks as reviewed
- [x] Shared `DocumentUploadModal` — reused across property + tenant docs
- [x] Rent payment model (PENDING/EXPECTED/RECEIVED/LATE/PARTIAL)
- [x] Auto-generate 3 months payments on page load (idempotent)
- [x] Auto-status updates, manual mark-received with partial support
- [x] Rent reminders cron — daily 8am UTC
- [x] Maintenance requests (OPEN/IN_PROGRESS/RESOLVED), immutable audit trail
- [x] Maintenance photos — landlord + tenant, `maintenance-photos` bucket
- [x] Awaab's Law — DAMP_MOULD sets `respondBy + 24h`, 4h email reminder cron
- [x] Tenant portal — maintenance submission with photos

---

## ✅ Completed — Check-in Reports

- [x] `CheckInReport` model (DRAFT/PENDING/IN_REVIEW/AGREED/DISPUTED)
- [x] `CheckInPhoto` model with uploadedBy, condition, caption, takenAt
- [x] Landlord creates report — room-by-room photos + condition tags
- [x] Token-based tenant review page `/tenant/check-in/[token]` (no portal login needed)
- [x] Tenant photo upload with condition + comment
- [x] Dual confirmation — PDF only generated when both parties confirmed
- [x] PDF generation — cover + rooms + ALL photos from both parties, attributed
- [x] DISPUTED state — all photos included regardless
- [x] Move-in document email — PDF + Gas Safety + EPC sent on AGREED

---

## ✅ Completed — Tenant Portal, SEO, Analytics

- [x] Tenant portal — documents, maintenance, rent history, check-in review, onboarding checklist
- [x] Dynamic sitemap, robots.ts, JSON-LD, OG image
- [x] Guides/Blog (MDX), article generator script (`npm run generate-article`)
- [x] Marketing feature pages, RRA page, privacy/terms/cookies
- [x] Google Analytics + Microsoft Clarity + Facebook Pixel (consent-gated)
- [x] vanilla-cookieconsent (necessary/analytics/marketing)
- [x] Sentry (client + server + edge), PostHog (EU, consent-gated)
- [x] Crisp live chat (marketing pages only)

---

## 🔴 Next Priority — Stripe Integration

Biggest blocker for monetisation. Everything is currently mock.

- [ ] Stripe Products/Prices: Free (1 property), Pro (£9.99/mo per additional)
- [ ] 2nd property added → Stripe Checkout for subscription
- [ ] Subscription quantity updates as properties added/removed
- [ ] Webhook: `customer.subscription.updated`, `invoice.payment_failed`
- [ ] Block features if subscription lapsed → upgrade prompt
- [ ] Stripe Customer Portal link in Settings
- [ ] Payment Intent for screening unlock (£9.99 first / £1.49 additional / £11.99 standalone)
- [ ] Replace MOCK_PAID throughout
- [ ] `Payment` record on successful charge
- [ ] Webhook: `payment_intent.succeeded`
- [ ] Test mode E2E → switch to live keys

---

## 🟡 High Priority Backlog

### GDPR — Check-in Photo Deletion Cron
- [ ] `/api/cron/gdpr-cleanup` — find tenancies ended >3 months ago
- [ ] Delete check-in photos from bucket for those reports
- [ ] Log `photosDeletedAt` on CheckInReport
- [ ] Schedule weekly in Vercel Cron

### Screening PDF Report
- [ ] Generate PDF from FinancialReport (score, grade, breakdown, summary)
- [ ] Store in `documents` bucket, save `pdfUrl` on FinancialReport
- [ ] Include in move-in document email

### Section 13 — Rent Increase
- [ ] "Raise rent" button — block if last increase <12 months
- [ ] Generate Section 13 Notice PDF → email to tenant
- [ ] Log effective date (rent + 2 months), update rent tracker from that date

### APT Contract Generation
- [ ] APT template in `lib/templates/apt-contract.ts`
- [ ] Generate PDF with tenancy + user data (pdf-lib)
- [ ] Signing flow — unique tokens, `/sign/[token]` page
- [ ] Both signed → confirmation emails + `contractUrl` saved
- [ ] Connect to Stripe (£10) once Stripe integrated

### Tenant Notice (Tenant-Initiated)
- [ ] "Give notice" in portal → date picker (min today + 2 months)
- [ ] Property → NOTICE_GIVEN, landlord notified

### Section 8 Notice
- [ ] Ground selector (8/10/11, 1, 2, 7A/14)
- [ ] Per ground: evidence list + notice period shown
- [ ] Generate Section 8 Notice PDF, log ground + date

---

## 🟢 Medium Priority Backlog

### Check-Out Inspection
- [ ] Initiate from property detail when NOTICE_GIVEN
- [ ] Room-by-room photos (reuse check-in components)
- [ ] Side-by-side comparison: check-in vs check-out per room
- [ ] Landlord decision: full return / partial / full deduction
- [ ] On complete: Tenancy → ENDED, Property → VACANT

### Dispute Evidence Pack (£29)
- [ ] Multi-section PDF: tickets, rent history, docs, photos, notices, event log
- [ ] Tribunal + Ombudsman letter templates included
- [ ] Connect to Stripe once integrated

### AI Date Extraction (Compliance Docs)
- [ ] On upload, call Claude to extract issuedDate + expiryDate from PDF
- [ ] Pre-fill date fields, show "AI extracted — please verify"

### Right to Rent Expiry Alerts
- [ ] Add to compliance cron: R2R docs expiring ≤30 days
- [ ] Email landlord, red badge on tenant card

### Settings — Billing + Notifications
- [ ] Billing section: Stripe Customer Portal link
- [ ] Notification preferences (email toggles per event)
- [ ] Danger zone: delete account (type "DELETE", cascade)

---

## 🔵 Lower Priority / Future

### GoCardless Direct Debit
- [ ] Tenant authorises mandate via redirect
- [ ] Auto-collect on `paymentDay`, webhook → RECEIVED/LATE

### Bank Statement Auto-Match
- [ ] Claude extracts transactions, "Auto-match" reconciles with RentPayment records

### Making Tax Digital
- [ ] Expense log per property, quarterly CSV export
- [ ] HMRC MTD API (post-MVP)

### Financial Passport (Tenant-Facing)
- [ ] Currently email capture only at `/passport`
- [ ] Full flow: tenant uploads → portable verification token → share with any landlord

---

## ⏸ Deferred Post-MVP

- [ ] WhatsApp notifications (Twilio)
- [ ] Open Banking / bank feed
- [ ] Native mobile app (React Native)
- [ ] Contractor portal
- [ ] Multi-user / team accounts
- [ ] Bulk document import
- [ ] Property performance analytics
- [ ] CCJ check via Trust Online API
