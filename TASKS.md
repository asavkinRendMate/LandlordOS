# TASKS.md — Sprint Plan

10-week build plan. Each sprint = 2 weeks. Tasks are ordered by dependency — complete in sequence within each sprint.

Status: `[ ]` todo · `[x]` done · `[-]` in progress · `[~]` skipped/deferred

---

## Sprint 1 — Foundation & Compliance (Weeks 1–2)

**Goal:** Working auth, property management, compliance tab with AI date extraction.

### Marketing & Waitlist (completed outside original sprint plan)
- [x] Landing page at `/` — hero, pain points, how it works, features, pricing, waitlist form
- [x] Waitlist API (`POST /api/waitlist`) — stores email + property count
- [x] OS Places postcode lookup (`/api/address`) — used in property forms
- [x] `lib/os-places.ts` — address lookup helper

### Setup
- [x] Initialise Next.js 14 project with TypeScript strict mode
- [x] Configure Tailwind CSS + install shadcn/ui
- [x] Set up Supabase project (get DATABASE_URL, DIRECT_URL, keys)
- [x] Configure Prisma with `schema.prisma` (full schema from CLAUDE.md)
- [x] Run first migration: `npx prisma migrate dev --name init`
- [x] Set up environment variables (.env.local with all keys from CLAUDE.md)
- [x] Configure Resend for transactional email
- [x] Deploy skeleton to Vercel, confirm DB connection works

### Auth
- [x] Configure Supabase Auth with magic link (email only, no social)
- [x] Create `middleware.ts` to protect `/dashboard` and `/tenant/dashboard` routes
- [x] Build `/login` page — email input → "Check your email" state
- [x] Handle magic link callback (`/auth/callback`)
- [x] Create `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/auth.ts`
- [x] Test: full login flow end to end

### Dashboard Shell
- [x] Create dashboard layout (`app/(dashboard)/layout.tsx`) with sidebar nav
- [x] Sidebar links: Overview, Settings (+ "My Rental" context switcher for dual-role users)
- [x] Dashboard overview page — redirects to onboarding if no properties, property cards otherwise
- [x] User session accessible throughout dashboard

### Property Management
- [x] "Add property" form — postcode lookup (OS Places API) + address, type, optional nickname
- [x] On create: seed 4 blank ComplianceDoc records for the property
- [x] Property cards on dashboard with status badge and compliance strip
- [x] Property detail page — compliance & docs section, tenant section, applications section
- [x] Tenant card on property detail: clickable → tenant detail page, 4 doc status dots, dynamic border colour
- [ ] "Edit property" — address fields only

### Compliance Tab
- [x] Display 4 compliance status cards (Gas Safety, EPC, EICR, How to Rent) — status derived from PropertyDocument uploads
- [x] File upload via drag-and-drop modal — document type dropdown, expiry date for Gas/EPC/EICR, multi-file batch
- [x] Expiry date input in upload modal (shown conditionally per document type)
- [~] "How to Rent Guide" — implemented as a document type (no separate checkbox/version field)
- [x] Status badges on compliance cards: Valid · Expiring soon · Expired · Not uploaded
- [x] Dashboard alert bar: surface items expiring within 30 days (reads from legacy ComplianceDoc model)

### AI Date Extraction
- [ ] Create `lib/anthropic.ts` with Claude client
- [ ] Create `lib/prompts/extract-dates.ts` with system prompt
- [ ] Build `/api/ai/extract-dates` route — accepts file, returns `{ expiryDate, issuedDate }`
- [ ] Wire up to compliance upload: after upload, auto-call extraction, pre-fill date fields
- [ ] Show "AI extracted — please verify" UI indicator

### Tenant Invite & Onboarding (completed outside original sprint plan)
- [x] Tenant model with CANDIDATE / INVITED / TENANT / FORMER_TENANT statuses
- [x] `inviteToken` (UUID) as public-facing URL token (never exposes DB id)
- [x] "Send invite email" button on property detail — emails tenant join link
- [x] `/tenant/join/[token]` page — confirm name/phone, read-only email and property
- [x] On confirm: status → TENANT, `confirmedAt` set, magic link emailed via Supabase Auth
- [x] Tenant dashboard at `/tenant/dashboard` (auth-protected, magic link sign-in)
- [x] Context switcher in landlord dashboard sidebar: "My Rental" shown if user is also a TENANT

### Tenant Document Management (completed outside original sprint plan)
- [x] `TenantDocument` model — 9 types, Supabase Storage (`tenant-documents` bucket)
- [x] `POST /api/tenant-documents/upload` — multipart, `{tenantId}` extra field
- [x] `GET /api/tenant-documents?tenantId=` — list documents for a tenant
- [x] `GET /api/tenant-documents/[id]` — signed URL (60-min expiry)
- [x] `DELETE /api/tenant-documents/[id]` — remove from storage + DB
- [x] `PATCH /api/tenants/[id]` — update tenant name/phone
- [x] Tenant detail page `/dashboard/properties/[id]/tenant/[tenantId]` — R2R status, inline edit, required docs (6), other docs (3)
- [x] Tenant self-upload on tenant portal (`/tenant/dashboard`) — "My Documents" section with `DocumentUploadModal`
- [x] Shared `DocumentUploadModal` component (`components/shared/DocumentUploadModal.tsx`) — reused for property docs and tenant docs

### Rent Payment Model (completed outside original sprint plan)
- [x] `RentPayment` model with `PaymentStatus` enum (PENDING/EXPECTED/RECEIVED/LATE/PARTIAL)
- [x] `lib/payments.ts` — `generateUpcomingPayments` (3 months, idempotent) + `updatePaymentStatuses`
- [x] `supabase/migrations/20260309_rent_payments.sql` migration applied

---

## Sprint 2 — Tenant Pipeline (Weeks 3–4)

**Goal:** Full applicant flow from application link to landlord decision.

### Application Link
- [x] Application link shown on property detail page: `[domain]/apply/[propertyId]`
- [x] Copy-to-clipboard button
- [x] "Send by email" inline form (emails the link via Resend)
- [ ] "Open applications" button explicitly sets Property status → APPLICATION_OPEN

### Application Form (Public — No Auth)
- [x] Build `/apply/[propertyId]` page — validate propertyId, show property address
- [x] Form fields: name, email, phone, current address, employment status, income, message
- [ ] File uploads: ID doc, income proof, reference letter (optional)
- [x] On submit: Tenant record created with status CANDIDATE
- [ ] Confirmation email to applicant + notification email to landlord
- [x] Thank you / confirmation screen after submit

### Application Dashboard
- [x] "Applications" section on property detail — shows all CANDIDATE tenants
- [x] List applicants: name, email, status badge
- [ ] Per-applicant detail view: all fields + uploaded documents
- [ ] Action buttons: "Shortlist" / "Reject" (current: only "Send invite email")
- [ ] Rejection: update status, send rejection email template

### AI Screening (Paid — £15)
- [ ] Stripe Payment Intent for £15 Screening Pack
- [ ] `/api/ai/screen-applicant` route — reads uploaded docs, calls Claude
- [ ] `lib/prompts/screen-applicant.ts` — prompt for income verification, affordability, document quality
- [ ] Parse Claude response into structured `{ summary, score, flags }`
- [ ] Store `aiSummary` + `aiScore` on Application record
- [ ] Display formatted AI summary in applicant detail view
- [ ] Score badge: 🟢 GREEN · 🟡 AMBER · 🔴 RED

### Accept & Reject Flow
- [ ] "Accept" button — modal: confirm selection, warn others will be rejected
- [ ] On accept: Application status → ACCEPTED, property status → OFFER_ACCEPTED
- [ ] All other applications → REJECTED with auto-email
- [ ] Begin move-in flow (deposit step)

---

## Sprint 3 — Move-In & Documents (Weeks 5–6)

**Goal:** Deposit tracking, APT contract generation, e-signature, inventory report.

### Deposit Tracking
- [ ] Deposit section in move-in flow: enter amount, select scheme (DPS / MyDeposits / TDS)
- [ ] Generate PDF instructions for the selected scheme
- [ ] "Mark as protected" checkbox + reference number field
- [ ] Save `depositAmount`, `depositScheme`, `depositRef`, `depositProtected` to Tenancy
- [ ] Alert if not protected after 28 days (shown in compliance section)

### APT Contract (Paid — £10)
- [ ] Store APT template as HTML/Markdown in `/lib/templates/apt-contract.ts`
- [ ] Stripe Payment Intent for £10
- [ ] Contract generation endpoint: fill template with Tenancy + User data
- [ ] Generate PDF using `pdf-lib` or `puppeteer`
- [ ] Upload PDF to Supabase Storage, save URL to Tenancy
- [ ] Send signing emails to both parties with unique signing tokens

### E-Signature Flow
- [ ] Create SigningToken model (or extend Tenancy): `landlordToken`, `tenantToken`, `landlordSignedAt`, `tenantSignedAt`
- [ ] Signing page `/sign/[token]` — show contract PDF, "I agree" button
- [ ] On sign: record timestamp + IP address, update signed status
- [ ] When both signed: update Tenancy `contractUrl`, send confirmation emails
- [ ] Dashboard shows contract status: Pending / Landlord signed / Fully signed

### Inventory Report (Paid — £5)
- [ ] Stripe Payment Intent for £5
- [ ] Initiate inventory: send email to both parties with upload link `/inventory/[token]`
- [ ] Inventory upload page: room selector + photo upload + comment per photo
- [ ] Photos stored in Supabase Storage with timestamp metadata
- [ ] Both parties submit → PDF Inventory Report generated
- [ ] Both receive PDF via email, shown confirmation button
- [ ] Both confirm → Tenancy status → ACTIVE, Property status → ACTIVE

### Documents Tab
- [x] General document storage for property (PropertyDocument model, Supabase Storage)
- [x] Upload any file with document type selection (14 types) via drag-and-drop modal
- [x] List view with file name, type, size, date, expiry badge, download link (signed URL)
- [x] Delete document (with confirmation)
- [x] Tenant acknowledgment: tenant can mark documents as reviewed; landlord sees ack status

---

## Sprint 4 — Active Tenancy & Termination (Weeks 7–8)

**Goal:** Rent tracker, tenant portal, maintenance tickets, Section 8, dispute pack.

### Rent Tracker UI
- [ ] Rent tab on property detail: monthly list showing due date, amount, status
- [ ] "Mark as received" button per month — sets `paidAt`, status → RECEIVED
- [ ] Partial payment: enter amount received, status → PARTIAL, remainder carried
- [ ] Dashboard property card: red badge if any payment LATE
- [ ] Call `generateUpcomingPayments` on tenancy creation / activation

### Rent Reminder Emails
- [ ] Cron job: daily check at 08:00 UK time
- [ ] Send reminder email to tenant 3 days before due date
- [ ] Send alert to landlord if unpaid on due date
- [ ] Send escalation email to landlord after 7 days overdue

### Tenant Portal (auth-required, already live at `/tenant/dashboard` — extend with:)
- [x] Read-only rent payment history view (status per month)
- [x] Maintenance request form: title, description, priority
- [x] Submitted requests show status (Open / In Progress / Resolved)
- [ ] "Give notice" button with explanation of 2-month minimum

### Maintenance Tickets
- [x] `MaintenanceRequest` model with priority (LOW/MEDIUM/HIGH/URGENT) and status (OPEN/IN_PROGRESS/RESOLVED)
- [x] `MaintenanceStatusHistory` model — immutable audit trail for all status changes
- [x] `MaintenancePhoto` model — photo uploads with `maintenance-photos` Supabase Storage bucket
- [x] Maintenance request created from tenant portal submission (POST /api/maintenance)
- [ ] Landlord notification email on submission
- [x] `/dashboard/maintenance` — list all requests with status filter tabs and priority sort
- [x] `/dashboard/maintenance/[id]` — detail page: description, photos, status dropdown, timeline
- [x] Photo upload and deletion (landlord + tenant), max 20 per request, 10 MB limit
- [ ] **Awaab's Law:** category field, DAMP_MOULD → `respondBy = createdAt + 24h`, countdown timer
- [ ] Status change → notification email to tenant
- [x] All status changes logged with timestamp and actor (MaintenanceStatusHistory)

### Section 13 — Rent Increase
- [ ] "Raise rent" button in Tenancy section
- [ ] Check: last increase date — block if <12 months ago with explanation
- [ ] Input: new monthly rent amount
- [ ] Generate Section 13 Notice PDF
- [ ] Send to tenant via email
- [ ] Log: `rentIncreaseDate`, `newRentAmount`, effective date (rent + 2 months)
- [ ] Rent tracker updates from effective date

### Tenant Notice (Tenant-Initiated)
- [ ] "Give notice" in tenant portal → date picker
- [ ] Enforce minimum 2-month notice (earliest selectable date = today + 2 months)
- [ ] On submit: Property status → NOTICE_GIVEN, landlord notified
- [ ] Auto-checklist shown to landlord: inspection, deposit, PRS Database, How to Rent

### Section 8 Notice (Landlord-Initiated)
- [ ] "Serve notice" button in dashboard
- [ ] Ground selector: Ground 8/10/11 (arrears), Ground 1 (moving in), Ground 2 (sale), Ground 7A/14 (ASB)
- [ ] For each ground: show required evidence list + notice period
- [ ] Generate Section 8 Notice PDF with selected ground
- [ ] Log: ground, date served

### Check-Out Inspection
- [ ] Initiate from property detail (when status = NOTICE_GIVEN)
- [ ] Same photo upload flow as inventory
- [ ] Side-by-side photo comparison: move-in vs check-out per room
- [ ] Landlord decision: Full return / Partial deduction / Full deduction
- [ ] Deduction amount field + reason field
- [ ] System generates deposit return instructions for selected scheme
- [ ] On complete: Tenancy status → ENDED, Property status → VACANT

### Dispute Pack (Paid — £29)
- [ ] Stripe Payment Intent for £29
- [ ] `/api/generate-dispute-pack` endpoint
- [ ] Collect: all tickets, rent history, signed documents, inventory photos, notices, event log
- [ ] Generate multi-section PDF
- [ ] Include: Tribunal letter template, Ombudsman letter template
- [ ] Upload to storage, send download link via email
- [ ] Available on any active or ended tenancy

---

## Sprint 5 — Payments, Alerts & Polish (Weeks 9–10)

**Goal:** Full Stripe integration, compliance cron, daily alerts, QA and launch prep.

### Stripe Subscription
- [ ] Stripe Products/Prices: Free tier (1 property), Pro (£10/mo per property)
- [ ] When landlord adds 2nd property → Stripe checkout for subscription
- [ ] Subscription quantity updates automatically as properties added/removed
- [ ] Stripe webhook handler: `customer.subscription.updated`, `invoice.payment_failed`
- [ ] Block dashboard features if subscription lapsed (show upgrade prompt)
- [ ] Stripe Customer Portal link in Settings

### Stripe One-Time Payments
- [ ] Payment Intent for each paid event (Screening, Contract, Inventory, Dispute Pack)
- [ ] Payment success → unlock feature, store `Payment` record
- [ ] Failed payment → error state with retry option
- [ ] Stripe webhook: `payment_intent.succeeded`

### Compliance Cron Job
- [ ] `/api/cron/alerts` endpoint protected with `CRON_SECRET`
- [ ] Vercel Cron: run daily at 08:00 UK time
- [ ] Query: compliance docs expiring in 30, 14, 7 days → email per landlord (digest)
- [ ] Query: deposit unprotected after 28 days → urgent email
- [ ] Query: Awaab's Law tickets approaching 24h → immediate email
- [ ] Query: rent overdue today → email to landlord

### Settings Page
- [ ] Profile: name, email (read-only)
- [ ] Billing: Stripe Customer Portal link
- [ ] Notification preferences (email toggles)
- [ ] Danger zone: delete account (with confirmation)

### QA & Polish
- [ ] Mobile responsiveness audit — all pages work on iOS/Android browser
- [ ] Empty states: every list has a helpful empty state
- [ ] Error states: every form has error handling
- [ ] Loading states: Suspense boundaries on all data-fetching components
- [ ] Email templates: preview and test all 14 templates
- [ ] End-to-end test: full landlord journey (register → add property → find tenant → active tenancy → termination)
- [ ] End-to-end test: applicant journey (apply → screening → accept → portal → ticket → notice)
- [ ] Security review: confirm no sensitive data exposed, all routes protected

### Launch Prep
- [ ] Set up custom domain on Vercel
- [ ] Configure Resend with custom sending domain
- [ ] Set up Stripe in live mode (not test)
- [ ] Set production environment variables
- [ ] Enable Vercel Analytics
- [ ] Create `/privacy` and `/terms` pages (basic)
- [ ] Test magic link flow in production
- [ ] Soft launch: invite waitlist signups

---

---

## Near-Term Backlog (identified during build, not yet sprint-scheduled)

### GoCardless Direct Debit
- [ ] GoCardless API integration (`lib/gocardless.ts`)
- [ ] Tenant authorises mandate via GoCardless redirect flow
- [ ] Auto-collect rent on `paymentDay` each month
- [ ] Webhook handler: payment collected → update `RentPayment` status → RECEIVED
- [ ] Webhook handler: payment failed → status → LATE, email to landlord
- [ ] Display mandate status on tenant detail page

### Right to Rent Expiry Alerts
- [ ] Add to daily cron: query TenantDocuments where type=RIGHT_TO_RENT and expiry ≤30 days
- [ ] Email to landlord: "R2R for [Tenant Name] expires in [N] days — [Property Address]"
- [ ] Show red badge on tenant card when R2R is expired/missing

### Compliance Expiry Email Alerts (cron)
- [ ] `/api/cron/alerts` endpoint protected with `CRON_SECRET`
- [ ] Vercel Cron: run daily at 08:00 UK time
- [ ] Query: compliance docs (Gas Safety, EPC, EICR) expiring in 30, 14, 7 days → digest email per landlord
- [ ] Query: deposit unprotected after 28 days → urgent email

### AI Financial Scoring Engine — IMPLEMENTED
- [x] `ScoringRule` model (30 rules across 6 categories: AFFORDABILITY, STABILITY, DEBT, GAMBLING, LIQUIDITY, POSITIVE)
- [x] `ScoringConfig` model (versioned config, one active at a time)
- [x] `FinancialReport` model (PENDING → PROCESSING → COMPLETED/FAILED)
- [x] `lib/scoring/engine.ts` — Claude API (claude-sonnet-4-20250514) analyses bank statement PDFs
- [x] `POST /api/scoring/upload` — upload bank statement PDF, trigger background analysis
- [x] `GET /api/scoring/[reportId]` — poll report status and results
- [x] `POST /api/scoring/[reportId]` — re-trigger analysis (admin use)
- [x] `/verify/[token]` — public financial report verification page
- [x] `/passport` — Financial Passport landing page (pre-launch email capture)
- [x] `prisma/seed-scoring.ts` — seeds 30 rules + ScoringConfig v1
- [x] Property has `requireFinancialVerification` flag
- [x] Property detail page shows scoring results inline per tenant (grade, score, summary)
- [ ] PDF report generation from FinancialReport data
- [ ] Stripe Payment Intent for scoring (currently free)

### Bank Statement AI Auto-Match (Rent Tracker)
- [ ] Claude extracts transactions, identifies rent credits matching `monthlyRent` amount
- [ ] Return structured `{ matchedPayments: [{ date, amount, reference }] }`
- [ ] UI: "Auto-match" button in rent tracker reconciles parsed results with RentPayment records

### Maintenance Requests (Tenant Portal) — IMPLEMENTED
- [x] `MaintenanceRequest` model: propertyId, tenantId, title, description, priority, status
- [x] `MaintenanceStatusHistory` + `MaintenancePhoto` models
- [x] Ticket submission form in tenant portal
- [ ] Landlord notification email on submission
- [x] Maintenance tab on dashboard: list all tickets with status/date/priority filter
- [x] Ticket detail: full description, photos, status dropdown, status timeline
- [ ] **Awaab's Law:** add category field, if DAMP_MOULD → `respondBy = createdAt + 24h`, countdown timer
- [ ] Landlord comment/note field on ticket detail (currently only status-change notes)

### Settings Page
- [ ] `/dashboard/settings` — profile name (editable), email (read-only, from Supabase Auth)
- [ ] Billing section: Stripe Customer Portal link (manage subscription, payment method)
- [ ] Notification preferences (email toggle per event type)
- [ ] Danger zone: delete account (requires typing "DELETE", cascades all data)

### Stripe Subscription Billing
- [ ] Stripe Products/Prices: Free (1 property), Pro (£10/mo per property)
- [ ] When 2nd property added → Stripe Checkout for subscription
- [ ] Subscription quantity updates as properties added/removed
- [ ] Webhook: `customer.subscription.updated`, `invoice.payment_failed`
- [ ] Block dashboard features if subscription lapsed → upgrade prompt
- [ ] Stripe Customer Portal link in Settings

### Closed Beta Access — IMPLEMENTED
- [x] "Closed Beta" button on landing page navbar (secondary, left of "Join the waitlist")
- [x] Modal: access code input (type=password), shake animation on wrong code, redirect to /login on correct
- [x] Hardcoded code `4577`, stored in sessionStorage — soft friction only, not real security

### Row Level Security (RLS) — IMPLEMENTED
- [x] RLS enabled on all tables (15/15 tables secured)
- [x] First batch (20260305–20260309): users, properties, tenancies, compliance_docs, waitlist, tenants, property_documents, document_acknowledgments, rent_payments
- [x] Second batch (20260315): maintenance_requests, maintenance_photos, maintenance_status_history, tenant_documents, financial_reports, scoring_configs, scoring_rules
- [x] Landlord access via `properties.user_id = auth.uid()::text`
- [x] Tenant access via `tenants.user_id = auth.uid()::text`
- [x] scoring_configs/scoring_rules: authenticated read-only (managed via DB)

### Making Tax Digital (MTD) — Landlord Income
- [ ] Track income (RentPayment RECEIVED) and expenses per property
- [ ] Expense log: category (repairs, insurance, agent fees, other), amount, date, receipt upload
- [ ] Quarterly income/expense summary exportable as CSV
- [ ] HMRC MTD API integration (Phase 2 — post-MVP): submit quarterly updates directly

---

## Deferred (Post-MVP)

- [ ] WhatsApp notifications via Twilio
- [ ] Open Banking / bank feed integration
- [ ] Native mobile app (React Native)
- [ ] Contractor portal
- [ ] Multi-user / team accounts
- [ ] Bulk document import
- [ ] Property performance reporting / analytics
