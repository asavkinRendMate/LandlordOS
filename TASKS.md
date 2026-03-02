# TASKS.md — Sprint Plan

10-week build plan. Each sprint = 2 weeks. Tasks are ordered by dependency — complete in sequence within each sprint.

Status: `[ ]` todo · `[x]` done · `[-]` in progress · `[~]` skipped/deferred

---

## Sprint 1 — Foundation & Compliance (Weeks 1–2)

**Goal:** Working auth, property management, compliance tab with AI date extraction.

### Setup
- [ ] Initialise Next.js 14 project with TypeScript strict mode
- [ ] Configure Tailwind CSS + install shadcn/ui
- [ ] Set up Supabase project (get DATABASE_URL, DIRECT_URL, keys)
- [ ] Configure Prisma with `schema.prisma` (full schema from CLAUDE.md)
- [ ] Run first migration: `npx prisma migrate dev --name init`
- [ ] Set up environment variables (.env.local with all keys from CLAUDE.md)
- [ ] Configure Resend for transactional email
- [ ] Deploy skeleton to Vercel, confirm DB connection works

### Auth
- [ ] Configure Supabase Auth with magic link (email only, no social)
- [ ] Create `middleware.ts` to protect `/dashboard` routes
- [ ] Build `/login` page — email input → "Check your email" state
- [ ] Handle magic link callback (`/auth/callback`)
- [ ] Create `lib/supabase/server.ts` and `lib/supabase/client.ts`
- [ ] Test: full login flow end to end

### Dashboard Shell
- [ ] Create dashboard layout (`app/(dashboard)/layout.tsx`) with sidebar nav
- [ ] Sidebar links: Overview, Properties, Settings
- [ ] Dashboard overview page — empty state with "Add your first property" CTA
- [ ] User session accessible throughout dashboard

### Property Management
- [ ] "Add property" form — address, city, postcode, type
- [ ] On create: seed 4 blank ComplianceDoc records for the property
- [ ] Property cards on dashboard with status badge (VACANT default)
- [ ] Property detail page with tab navigation (Compliance / Tenancy / Rent / Documents / Maintenance)
- [ ] "Edit property" — address fields only

### Compliance Tab
- [ ] Display 4 compliance items: Gas Safety, EPC, EICR, How to Rent Guide
- [ ] File upload for each item → uploads to Supabase Storage
- [ ] Manual expiry date input field
- [ ] "How to Rent Guide" — checkbox + date issued (no file upload)
- [ ] Status badges: ✅ Valid · ⚠️ Expiring · ❌ Expired · — Not uploaded
- [ ] Dashboard alert bar: surface items expiring within 30 days

### AI Date Extraction
- [ ] Create `lib/anthropic.ts` with Claude client
- [ ] Create `lib/prompts/extract-dates.ts` with system prompt
- [ ] Build `/api/ai/extract-dates` route — accepts file, returns `{ expiryDate, issuedDate }`
- [ ] Wire up to compliance upload: after upload, auto-call extraction, pre-fill date fields
- [ ] Show "AI extracted — please verify" UI indicator

---

## Sprint 2 — Tenant Pipeline (Weeks 3–4)

**Goal:** Full applicant flow from application link to landlord decision.

### Application Link
- [ ] "Open applications" button on vacant property
- [ ] Sets Property status → APPLICATION_OPEN
- [ ] Generates unique token, saves to Property
- [ ] Displays shareable URL: `[domain]/apply/[token]`
- [ ] Copy-to-clipboard button

### Application Form (Public — No Auth)
- [ ] Build `/apply/[token]` page — validate token, show property address
- [ ] Form fields: name, email, phone, current address, employment, income, message, move-in date, pets
- [ ] File uploads: ID doc, income proof, reference letter (optional)
- [ ] Files uploaded to Supabase Storage: `/applications/[applicationId]/`
- [ ] On submit: Application record created, confirmation email to applicant, notification email to landlord
- [ ] Thank you / confirmation screen after submit

### Application Dashboard
- [ ] "Applications" section on property detail page
- [ ] List all applications: name, date, employment, income, AI score badge
- [ ] Per-applicant detail view: all fields + uploaded documents (signed URLs)
- [ ] Action buttons: "Shortlist" / "Reject"
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
- [ ] General document storage for property
- [ ] Upload any file with name + category (contract / inventory / certificate / correspondence)
- [ ] List view with file name, category, date, download link (signed URL)
- [ ] Delete document

---

## Sprint 4 — Active Tenancy & Termination (Weeks 7–8)

**Goal:** Rent tracker, tenant portal, maintenance tickets, Section 8, dispute pack.

### Rent Tracker
- [ ] On tenancy activation: auto-create RentPayment records for next 12 months
- [ ] Rent tab: monthly list showing due date, amount, status (Pending / Paid / Overdue)
- [ ] "Mark as paid" button per month — sets `paidAt`, status → PAID
- [ ] Overdue logic: if today > dueDate and status = PENDING → show as OVERDUE
- [ ] Dashboard property card: red badge if any rent OVERDUE

### Rent Reminder Emails
- [ ] Cron job or scheduled function: daily check at 08:00
- [ ] Send reminder email to tenant 3 days before due date
- [ ] Send alert to landlord if unpaid on due date
- [ ] Send escalation email to landlord after 7 days overdue

### Tenant Portal
- [ ] Accessible via unique link `/portal/[token]` (token on Tenancy record)
- [ ] No login required
- [ ] Shows: property address, landlord contact, tenancy start date, monthly rent, payment day
- [ ] Maintenance request form: category, description, photo upload
- [ ] Submitted requests show status (Open / In Progress / Resolved)
- [ ] "Give notice" button with explanation of 2-month minimum

### Maintenance Tickets
- [ ] Ticket created from tenant portal submission
- [ ] Landlord notification email: category, description, photos
- [ ] Maintenance tab on property: list all tickets with status and date
- [ ] Ticket detail: full description, photos, status dropdown, comment field
- [ ] **Awaab's Law:** if DAMP_MOULD → set `respondBy = createdAt + 24h`, show countdown timer in red
- [ ] Status change → notification email to tenant
- [ ] All actions logged with timestamp (audit trail)

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

## Deferred (Post-MVP)

- [ ] WhatsApp notifications via Twilio
- [ ] Open Banking / bank feed integration
- [ ] HMRC / Making Tax Digital integration
- [ ] Native mobile app (React Native)
- [ ] Contractor portal
- [ ] Multi-user / team accounts
- [ ] Bulk document import
- [ ] Property performance reporting / analytics
