# SPEC.md — Product Specification

## Product

**Name:** LetSorted (letsorted.co.uk)
**Target:** UK private landlords who self-manage 1–5 properties
**Core value:** Simple property management — tenants, documents, rent and compliance in one place. Renters' Rights Act 2025 readiness built in, not the primary pitch.

---

## Background & Market Context

The Renters' Rights Act 2025 received Royal Assent on 27 October 2025 and comes into force **1 May 2026**. Key changes creating urgent pain for self-managing landlords:

- Section 21 "no fault" evictions abolished — landlords must use Section 8 Grounds with documented evidence
- All ASTs convert to Assured Periodic Tenancies (APT) — no more fixed terms
- Rent increases: maximum once per year, only via formal Section 13 Notice
- 15 new offences, fines up to £40,000
- Mandatory PRS Database registration for all landlords
- Awaab's Law applied to private rentals — damp/mould complaints require 24-hour response

**Target segment:** ~1.4 million self-managing UK landlords (52% of 2.82M total). 83% own 1–4 properties. Currently managing via spreadsheets, folder systems, and WhatsApp.

---

## Competitor Landscape

| Product | Strengths | Gap we exploit |
|---|---|---|
| August (Goodlord) | Strong lettings-agent tool, polished | Agent-focused, too complex for self-managers |
| NRLA Portfolio | NRLA brand trust, compliance tools | Clunky UX, no tenant-facing portal |
| Rentila | Free tier, decent rent tracker | No compliance focus, dated design |
| PaTMa | Compliance alerts, portfolio view | No tenant onboarding, no tenant portal |

**Positioning:** LetSorted is the only product that combines landlord compliance + tenant onboarding + tenant portal in a single clean UI built for 1–5 property self-managing landlords. Not competing with agent software.

---

## User Roles

| Role | Access | Auth |
|---|---|---|
| Landlord | Full dashboard, all properties | Magic link (email) |
| Tenant | Tenant portal (`/tenant/dashboard`) | Magic link (email) |
| Applicant | Apply form only (`/apply/[propertyId]`) | None — public form |
| Admin | Internal metrics (future) | — |

One Supabase user account can be both a landlord and a tenant simultaneously. The dashboard shell shows a "My Rental" context switcher when the signed-in user has an active Tenant record.

**Tenant statuses (TenantStatus enum):**
- `CANDIDATE` — submitted application via public apply form, not yet reviewed
- `INVITED` — landlord added them manually or accepted their application; invite email sent
- `TENANT` — confirmed their details via `/tenant/join/[token]`; has access to tenant dashboard
- `FORMER_TENANT` — tenancy ended

---

## Monetisation

### Subscription
- **1 property: FREE forever** (acquisition hook)
- **2+ properties: £10/month per property**

### One-time Paid Events (pay per use)
| Event | Price |
|---|---|
| Screening Pack — AI analysis of applicant documents | £15 |
| APT Contract generation | £10 |
| Inventory Report PDF | £5 |
| Dispute Pack | £29 |

Payment via Stripe. Subscription managed via Stripe Billing. One-time events charged via Stripe Payment Intents.

---

## Full Product Flow

### 1. Onboarding

**Landlord registers:**
1. Enters email → receives magic link
2. Clicks link → authenticated session
3. Minimal onboarding: name + property count
4. Redirected to dashboard

**Dashboard overview:**
- Cards for each property with status indicator:
  - 🟢 Active & compliant
  - 🟡 Needs attention (expiring cert / open ticket)
  - 🔴 Critical (overdue compliance / unpaid rent)
  - ⚪ Vacant
- Global alert bar at top: "Gas Safety expires in 14 days — Flat 2, Manchester"
- "Add property" CTA prominent when dashboard is empty

---

### 2. Add Property

Fields: address, city, postcode, property type (flat/house/HMO/other)

On creation:
- Property status set to VACANT
- Compliance checklist auto-created with 4 items (all blank):
  - Gas Safety Certificate
  - EPC
  - EICR
  - How to Rent Guide

---

### 3. Compliance & Document Management

Section on every property detail page. Two overlapping systems:

#### Dashboard compliance strip (legacy ComplianceDoc model)
Four coloured dots shown on each property card on the overview dashboard (Gas, EPC, EICR, H2R). Status is set on the `ComplianceDoc` record and drives the alert bar ("EPC expires in 14 days — Flat 2, Manchester"). These records are seeded when a property is created.

#### Property document system (PropertyDocument model)
Full document management with Supabase Storage. 14 document types:
Gas Safety Certificate, EPC, EICR, How to Rent Guide, Tenancy Agreement, Inventory Report, Deposit Certificate, Right to Rent, Building Insurance, Landlord Insurance, Section 13 Notice, Section 8 Notice, Check-out Inventory, Other.

**On the property detail page:**
- 4 compliance status cards at top (Gas Safety, EPC, EICR, How to Rent) — status derived from uploaded PropertyDocuments (not the legacy ComplianceDoc). Status logic: no doc → "Not uploaded" (grey), expiry >30 days → "Valid" (green), expiry ≤30 days → "Expiring soon" (orange), expiry passed → "Expired" (red), How to Rent → "Issued" (green) when any doc of that type exists.
- "Upload" button → drag-and-drop modal. Per-file: document type dropdown (required) + expiry date (shown only for Gas Safety, EPC, EICR). Multiple files in one batch.
- Document grid: file type icon (PDF red, image blue, DOCX blue, other grey), document name, type label, file size, upload date, expiry badge, tenant acknowledgment status.
- Download (signed URL, 60-min expiry) and delete (with confirmation).

**AI date extraction:** planned but not yet implemented. Spec: after upload, POST to `/api/ai/extract-dates`, Claude returns `{ expiryDate, issuedDate }`, UI pre-fills with "AI extracted — please verify" indicator.

#### Tenant document acknowledgment
Tenants see all property documents (PropertyDocument) for their property in the tenant dashboard. Each document has a "Mark as reviewed" checkbox. On click: POST `/api/documents/[id]/acknowledge`, creates a `DocumentAcknowledgment` record. Once acknowledged, shows "Reviewed on [date]" (cannot uncheck). Landlord sees acknowledgment status per document on the property detail page.

#### Tenant document management (TenantDocument model)
Separate from PropertyDocument. Tenant-specific documents uploaded by either the landlord (on the tenant detail page) or the tenant themselves (via the tenant portal).

**9 document types:** Passport, Right to Rent, Proof of Income, Bank Statements, Employer Reference, Previous Landlord Reference, Guarantor Agreement, Pet Agreement, Other.

**Required docs (shown on tenant detail page with status dots):** Right to Rent, Passport, Proof of Income, Bank Statements, Employer Reference, Previous Landlord Reference.

**Other docs:** Guarantor Agreement, Pet Agreement, Other.

**Expiry tracking:** Right to Rent and Passport have expiry dates. Status: Valid (green) / Expiring soon ≤30 days (orange) / Expired (red) / Missing (grey dot).

**Tenant card on property page:** shows 4 status dots (Right to Rent, Passport, Proof of Income, Bank Statements). Card border colour: red if R2R missing/expired, orange if any of the 4 are missing, green if all 4 valid.

**Storage:** private `tenant-documents` bucket in Supabase Storage. Path: `/{propertyId}/{tenantId}/{docId}/{filename}`. Always served via signed URLs (60-min expiry).

**API routes:**
- `GET /api/tenant-documents?tenantId=` — list tenant docs (landlord or tenant self)
- `POST /api/tenant-documents/upload` — multipart upload
- `GET /api/tenant-documents/[id]` — signed URL for download
- `DELETE /api/tenant-documents/[id]` — remove from storage + DB
- `PATCH /api/tenants/[id]` — update tenant name/phone

---

### 4. Tenant Pipeline (Vacant Property)

#### Step 1: Application Link
- Application link shown on property detail page: `[domain]/apply/[propertyId]`
- Copy-to-clipboard button + "Send by email" inline form (emails the link via Resend)
- Planned: "Open applications" button explicitly sets Property status → APPLICATION_OPEN

#### Step 2: Applicant Form (public, no login)
Applicant fills in at `/apply/[propertyId]`:
- Full name, email, phone (optional)
- Current address
- Employment status (employed / self-employed / student / other)
- Monthly income (£)
- Message to landlord (optional)
- Confirmation checkbox
- Submits → Tenant record created with status CANDIDATE
- File uploads (ID doc, payslips, references) — **planned, not yet implemented**
- Confirmation/notification emails — **planned, not yet implemented**

#### Step 3: Landlord Manages Applications
- "Applications" section on property detail shows all CANDIDATE tenants (name, email, status)
- "Send invite email" button converts candidate to INVITED and emails them join link
- Shortlist / Reject / AI scoring — **planned, not yet implemented**

#### Step 4: Tenant Onboarding
- Tenant receives invite email with link to `/tenant/join/[inviteToken]`
- Confirms name, phone; reads property address (read-only)
- On submit: status → TENANT, `confirmedAt` set, magic link emailed to tenant
- Tenant signs in via magic link → `/tenant/dashboard`

#### Step 5: AI Screening (Paid — £15 Screening Pack) — planned
- Stripe payment checked
- POST to `/api/ai/screen-applicant` with uploaded documents
- Claude analyses income, affordability (rent ≤35% income), document quality
- Returns GREEN / AMBER / RED score with structured summary

---

### 5. Move-In Process

#### Deposit
- Landlord enters deposit amount
- System generates PDF instruction: how to receive and protect deposit in chosen scheme (DPS / MyDeposits / TDS)
- Landlord marks "Deposit protected" + enters reference number
- **30-day deadline enforced:** alert if unprotected after 30 days from tenancy start

#### Contract Generation (Paid — £10)
- Stripe payment checked
- System fills pre-approved APT template (solicitor-reviewed)
- Auto-populated fields: landlord name, tenant name, property address, monthly rent, payment day, start date, notice periods
- PDF generated
- Both parties receive email with link to sign
- **E-signature flow:**
  - Unique signing link per party
  - Click "I agree" button + timestamp + IP + email recorded
  - Both signed → `contractUrl` saved to Tenancy, status updated
  - Valid under Electronic Communications Act 2000

#### Inventory Report (Paid — £5)
- Both parties invited via email to upload photos
- Mobile-optimised upload interface
- Structure: Room → Add photos → Add comment per photo
- Photos auto-timestamped and geotagged (if permission granted)
- Once both parties submit:
  - PDF Inventory Report generated
  - Both receive copy via email
  - Both click "Confirm" in their portal
- On both confirmations: Tenancy status → ACTIVE, Property status → ACTIVE

---

### 6. Active Tenancy Management

#### Rent Tracking
Implemented via the `RentPayment` model. Status enum: `PENDING → EXPECTED → RECEIVED | LATE | PARTIAL`.

`lib/payments.ts` provides two functions:
- `generateUpcomingPayments(tenancyId)` — idempotent, creates EXPECTED records for the next 3 months based on tenancy `paymentDay` and `monthlyRent`
- `updatePaymentStatuses()` — transitions EXPECTED → LATE when due date passes without payment

- Landlord manually marks rent as received (status → RECEIVED) and can record partial payments
- Automated emails (planned — via Resend):
  - Reminder to tenant 3 days before due date
  - Alert to landlord if unpaid on due date
  - Escalation if still unpaid 7 days after due date
- Dashboard shows red badge on property card if any rent LATE

**GoCardless Direct Debit (planned):** future integration to auto-collect rent and reconcile against RentPayment records automatically.

#### Tenant Portal
Accessible at `/tenant/dashboard` — requires magic link sign-in (email). Tenant can:
- View property address and key tenancy details
- Download and acknowledge landlord-uploaded PropertyDocuments (mark as reviewed)
- Upload their own TenantDocuments (passport, R2R, income proof, bank statements, etc.)
- View rent payment status (read-only) — planned
- If the tenant's account is also a landlord: "Switch to landlord dashboard" context switcher in nav
- Planned: submit maintenance requests, give notice

#### Maintenance Tickets
Landlord view:
- List of all open tickets across all properties
- Per ticket: category, description, photos, date submitted, status, legal deadline
- **Awaab's Law timer:** if category = DAMP_MOULD, `respondBy = createdAt + 24 hours`
- Landlord can:
  - Change status (Open → In Progress → Resolved)
  - Add internal comment
  - Message tenant (logged in ticket)
- Full audit trail — all actions timestamped

#### Section 13 Notice (Rent Increase)
- Landlord can raise rent maximum once per 12 months
- System checks date of last increase — blocks if <12 months
- Landlord enters new amount
- System generates Section 13 Notice PDF
- Email sent to tenant with notice
- 2-month notice period before new rent applies
- New monthly amount updated in Tenancy on effective date

---

### 7. Termination

#### Tenant-Initiated
1. Tenant clicks "Give notice" in portal
2. System enforces **minimum 2-month notice** — earliest possible date shown
3. Landlord notified with move-out date
4. Property status → NOTICE_GIVEN
5. Auto-checklist created for landlord:
   - Schedule check-out inspection
   - Arrange deposit return via scheme
   - Update PRS Database registration
   - Re-issue How to Rent Guide for next tenant

#### Landlord-Initiated (Section 8)
1. Landlord selects "Serve notice" in dashboard
2. Selects Section 8 Ground from list:
   - Ground 8/10/11: Rent arrears
   - Ground 1: Landlord/family moving in
   - Ground 2: Property sale
   - Ground 7A/14: Anti-social behaviour
3. System displays: required evidence, notice period, process steps
4. System generates Section 8 Notice PDF with correct ground
5. Landlord downloads and serves (system logs date)

#### Check-Out Inspection
- Both parties upload photos (same flow as inventory)
- Side-by-side comparison with move-in photos shown to landlord
- Landlord decides: full return / partial deduction / full deduction
- System generates instructions for deposit scheme dispute process
- Tenancy status → ENDED, Property status → VACANT

---

### 8. Dispute Pack (Paid — £29)

Available for any active or ended tenancy. Generates one-click evidence package:

Contents:
- Full maintenance ticket history (description, photos, dates, status changes)
- All rent payment records (paid/overdue timeline)
- All signed documents (contract, inventory)
- Inventory photos: move-in vs move-out side by side
- All notices served with dates
- Chronological event log of the entire tenancy
- Pre-filled letter template for:
  - First-tier Tribunal (Property Chamber)
  - Property Ombudsman
  - Deposit scheme dispute

Delivered as PDF package via email and download link.

---

### 9. Compliance Alerts (Cron Job)

Daily cron at 08:00 UK time (`/api/cron/alerts`):

Checks all properties for:
- Compliance docs expiring within 30 days → email to landlord
- Deposit unprotected >28 days from tenancy start → urgent email
- Rent overdue →already handled by rent tracker
- Awaab's Law tickets approaching 24h deadline → immediate email

---

## Email Templates

| Template | Trigger | Recipient |
|---|---|---|
| Magic link | Login request | Landlord |
| Application received | Applicant submits form | Applicant |
| New application | Applicant submits form | Landlord |
| Application shortlisted | Landlord shortlists | Applicant |
| Application rejected | Landlord rejects | Applicant |
| Application accepted | Landlord accepts | Applicant |
| Rent reminder | 3 days before due date | Tenant |
| Rent overdue | Day of due date if unpaid | Landlord |
| Maintenance received | Ticket submitted | Landlord |
| Maintenance update | Status changed | Tenant |
| Compliance expiry | 30/14/7 days before | Landlord |
| Section 13 Notice | Rent increase triggered | Tenant |
| Contract to sign | Contract generated | Both parties |
| Inventory to upload | Inventory initiated | Both parties |
| Dispute Pack ready | Pack generated | Landlord |

---

## Out of Scope (MVP)

- Open Banking / bank feed integration
- Native mobile apps (mobile web only)
- HMRC / Making Tax Digital integration
- Contractor portal
- Automated deposit transfer
- Multi-user / team accounts (one landlord per account)
- Live chat or video calls
- WhatsApp notifications (Phase 2)
- Tenant referencing via external agencies
