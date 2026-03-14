# CLAUDE.PATTERNS.md — Implementation Patterns & Design Decisions

Reference for how specific features were built and why. Read before modifying any of these systems.

---

## UI Design System

**Full spec in `UI.md` — read it before building any UI.**

### Import rules — always use these, never redefine inline

```typescript
// Form element classes
import { inputClass, selectClass, selectClassCompact, textareaClass, buttonClass, buttonSecondaryClass, buttonDangerClass } from '@/lib/form-styles'

// UI primitives
import { cardClass, Spinner, Modal, StatusBadge, PriorityBadge, EmptyState, AlertBar, TabFilter, ListRow, PageHeader } from '@/lib/ui'

// Utilities
import { fmtDate, fmtCurrency } from '@/lib/utils'
```

Form field styles in `lib/form-styles.ts` — `inputClass`, `selectClass` (full-width), `selectClassCompact` (fixed-width for flex rows). All `<select>` elements use `appearance-none` + `.select-chevron` CSS class for consistent custom arrow.

---

## AI Financial Scoring Engine

### Overview
`lib/scoring/engine.ts` — AI-powered bank statement analysis via Claude API (direct `fetch` to `https://api.anthropic.com/v1/messages`). Model: `claude-sonnet-4-20250514`.
`lib/scoring/logger.ts` — `ScreeningLogger` class: buffers log entries (stage/level/message/data) per report, flushes to `screening_logs` table, also writes to console for Vercel logs. Stages: INIT, PDF, VERIFY, VALIDATE, ANALYSE, SCORE, SAVE, COMPLETE, ERROR.

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
- **Index audit completed:** 2026-03-11 (migration `20260332_add_missing_indexes.sql`) — 7 indexes added across 6 models: `[expiryDate]` on ComplianceDoc, `[status]` and `[status, depositProtected]` on Tenancy, `[tenantId]` on DocumentAcknowledgment, `[status, respondBy]` on MaintenanceRequest, `[status]` on FinancialReport, `[userId]` on ComplianceAlertLog. Next audit recommended after adding new models.
- Monitor unused indexes: `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;`
- Run `EXPLAIN ANALYZE` on slow queries via Supabase Dashboard SQL Editor

### Screening Unlock Pricing
- Screening unlock pricing: trigger is report unlock only (never invite or upload). Subscriber: £9.99 first unlock per cycle, £1.49 each additional — cycle resets on property → VACANT. Pack user: 1 credit per unlock, no cycle logic. Subscriber with pack credits: subscriber price wins, pack untouched. See `lib/screening-pricing.ts` for implementation. // Updated: 2026-03-10 — screening unlock pricing rules  <!-- Auto-preserved by update-docs -->

### Name Verification & Fuzzy Matching
- Name verification uses Levenshtein fuzzy matching (`fastest-levenshtein`) as fallback: if AI says UNVERIFIED but any token pair between applicant and statement name has ≥80% similarity, upgrade to VERIFIED with soft warning. See `fuzzyNameMatch()` in `lib/scoring/engine.ts`. // Updated: 2026-03-10 — fuzzy name matching  <!-- Auto-preserved by update-docs -->

### Mock Payment Unlock Flow
- Mock payment unlock flow: Unlock button → `POST /api/payment/charge { reason, inviteId: reportId }` → `charge()` from `lib/payment-service.ts` (mock, requires saved card) → report `isLocked: false` + invite status → PAID. Client refetches report via `/api/scoring/${reportId}`. Fallback handles both property-linked (standalone/credit-pack) and invite-linked reports via `OR` query. Replace `charge()` mock with Stripe PaymentIntent when integrating real payments. // Updated: 2026-03-10 — mock payment flow  <!-- Auto-preserved by update-docs -->

### Screening Focused-Flow Layout
- Screening focused-flow pages use shared `ScreeningLayout` + `ScreeningCard` components from `components/screening-flow/`. Unified bg: `bg-[#f5f7f2]`, consistent nav with logo, compact footer. // Updated: 2026-03-10 — unified screening layout  <!-- Auto-preserved by update-docs -->

### Applicant Score Display
- Applicants list on property detail page shows score inline (`50/100`) for COMPLETED reports — landlord-only view. Colour uses `scoreTextColour(grade)` matching `gradeColour` thresholds from `ScreeningReportDisplay`. Never show grade label in this list. // Updated: 2026-03-10 — inline applicant score  <!-- Auto-preserved by update-docs -->

### Property Cascade Delete
- Property deletion (`DELETE /api/properties/[id]`) cascades through all related data + storage files. Deletion order matters to avoid FK violations: InspectionPhotos → PropertyInspections → MaintenancePhotos/StatusHistory → MaintenanceRequests → ScreeningLogs/FinancialReports → DocumentAcknowledgments → TenantDocuments → RentPayments → Tenancies → Tenants → PropertyDocuments → ComplianceDocs → PropertyRooms → ApplicationInvites → Property. Storage cleanup (best-effort) covers 5 buckets: documents, check-in-photos, tenant-documents, maintenance-photos, bank-statements. // Updated: 2026-03-10 — property cascade delete  <!-- Auto-preserved by update-docs -->

### Tenant Selection Modal
- Tenant selection modal (`SelectTenantModal`) uses 2-step confirmation: Step 1 shows selected tenant + rejections preview, Step 2 shows rose/red irreversibility warning. Only Step 2's "Yes, confirm" button triggers the API call. // Updated: 2026-03-10 — 2-step tenant confirm  <!-- Auto-preserved by update-docs -->

### Applications Section Collapse
- Applications section collapses when a tenant is active/invited (`historyOnly` prop). Shows "View application history (N)" toggle. Expanded view is read-only (name, email, status, score). Invite fields, send button, and financial verification toggle are hidden. // Updated: 2026-03-10 — collapsed applications  <!-- Auto-preserved by update-docs -->

### UK Postcode Validation
- UK postcode validator at `lib/validators/postcode.ts` — `isValidUKPostcode(address)` checks for UK postcode pattern anywhere in string. Used on `/apply/[propertyId]` currentAddress field via zod `.refine()`. // Updated: 2026-03-10 — postcode validation  <!-- Auto-preserved by update-docs -->

### Financial Verification Default
- "Require financial verification" defaults to ON (true) for all new properties. DB default changed in migration `20260331_financial_verification_default_true.sql`. Prisma schema `@default(true)`. // Updated: 2026-03-10 — financial verify default on  <!-- Auto-preserved by update-docs -->

### Candidate Result Screen
- Candidate result screen shared component at `components/screening-flow/CandidateResultScreen.tsx` — exports `CandidateScoreCard`, `CandidateFooter`, `scoreMessage`. Used by BOTH `/apply/[propertyId]` (property apply) and `/screening/apply/[token]` (invite apply). Never duplicate these components inline. // Updated: 2026-03-10 — unified candidate result screen  <!-- Auto-preserved by update-docs -->

### Background Scoring Route
- Background scoring uses dedicated `/api/scoring/process/[reportId]` route with `maxDuration = 60`. Upload routes (`/api/scoring/upload` and `/api/screening/invite/[token]/submit`) trigger analysis via fire-and-forget `fetch()` to this route — never call `analyzeStatement()` directly in upload routes. Base URL: `NEXT_PUBLIC_APP_URL` || `VERCEL_URL` || localhost. // Updated: 2026-03-10 — background scoring route  <!-- Auto-preserved by update-docs -->

### Contextual Section Help
- Property detail page has contextual help (i) modals on all section cards via `components/properties/SectionHelpModal.tsx`. Exports `SectionHelpModal`, `SectionHelpButton`, and `SectionHelpKey` type. Each section (documents, rooms, inspection, tenant, rent, maintenance, applications) has a circular (i) button positioned absolute top-right that opens a modal with description, example, and role. // Updated: 2026-03-10 — contextual section help  <!-- Auto-preserved by update-docs -->

### Stripe Phase 1 (Card Setup)
- **Stripe Phase 1 (card setup):** `lib/stripe.ts` = server client singleton + `getOrCreateStripeCustomer()`. `/api/stripe/webhook` = single webhook endpoint handling all Stripe events (setup_intent.succeeded implemented; Phase 2-4 TODOs for subscription/payment/checkout events). `/api/payment/setup-intent` = creates Stripe SetupIntent for PaymentElement. `PaymentSetupModal` now uses Stripe Elements (`@stripe/react-stripe-js`) — PCI compliant, no raw card numbers. Remove-card route detaches via `stripe.paymentMethods.detach()`. Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (server), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client). Webhook URL: `https://letsorted.co.uk/api/stripe/webhook`. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`. Charge/subscription functions in `lib/payment-service.ts` are still mock — will be replaced in Phase 2-3. // Updated: 2026-03-10 — Stripe Phase 1  <!-- Auto-preserved by update-docs -->

### MailerLite Onboarding
- MailerLite onboarding: `lib/mailerlite.ts`. `addToOnboardingSequence()` — call on user creation (first name set in profile PATCH). `updateSubscriber()` — call on: property added, tenant confirmed, contract BOTH_SIGNED, inspection AGREED. All calls fire-and-forget. Never block request handlers. Never call for demo users. Custom fields: `has_property`, `has_tenant`, `has_signed_contract`, `has_inspection`, `property_count`. Env vars: `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID` (both optional). // Updated: 2026-03-14 — MailerLite onboarding  <!-- Auto-preserved by update-docs -->

### Error Boundary / Sentry Pattern
- Error boundary `errorId` shown in UI = Sentry event ID from `Sentry.captureException()`. Never use `Sentry.lastEventId()` in render — it races with the `useEffect` that actually captures. Pattern: `useState(fallback)` → `useEffect` captures + `setErrorId(eventId)` // Updated: 2026-03-10 — Sentry fix  <!-- Auto-preserved by update-docs -->
