# SPEC.md — Product Specification

## Product

**Working name:** [TBD — domain not finalised]
**Target:** UK private landlords who self-manage 1–5 properties
**Core value:** Compliance-first property management built for the Renters' Rights Act 2025

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

## User Roles

| Role | Access | Auth |
|---|---|---|
| Landlord | Full dashboard, all properties | Magic link (email) |
| Tenant/Applicant | Apply form + Tenant portal | Link-based (token), no account |
| Admin | Internal metrics (future) | — |

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

### 3. Compliance Management

Tab on every property. Shows 4 mandatory compliance items:

#### Gas Safety Certificate
- Upload PDF/image
- AI extracts expiry date automatically (`/api/ai/extract-dates`)
- Manual override available
- Alert schedule: 30 days → yellow, 14 days → orange, 7 days → red, expired → critical
- If missing: link to Checkatrade with "find a Gas Safe engineer" instruction

#### EPC (Energy Performance Certificate)
- Upload file
- AI extracts rating (A–G) and expiry date
- Valid for 10 years
- Alert at 60 days before expiry
- Note: EPC must be minimum E rating to legally rent (show warning if below)

#### EICR (Electrical Installation Condition Report)
- Upload file
- AI extracts expiry date
- Valid for 5 years
- Alert at 30 days before expiry

#### How to Rent Guide
- No file upload — checkbox only
- Fields: date issued, which version issued
- Must be re-issued for every new tenancy
- System prompts when new tenancy starts: "Have you issued the current How to Rent Guide?"

**AI date extraction flow:**
1. Landlord uploads PDF
2. POST to `/api/ai/extract-dates` with file content
3. Claude reads document, returns `{ expiryDate, issuedDate, documentType }`
4. UI pre-fills fields, shows "AI extracted — please verify"
5. Landlord confirms or corrects

---

### 4. Tenant Pipeline (Vacant Property)

#### Step 1: Generate Application Link
- Landlord clicks "Open applications"
- Property status → APPLICATION_OPEN
- Unique public URL generated: `[domain]/apply/[token]`
- Landlord copies link → pastes into OpenRent / Rightmove / Zoopla listing

#### Step 2: Applicant Form (no login required)
Applicant fills in:
- Full name, email, phone
- Current address
- Employment status (employed / self-employed / student / other)
- Monthly income (£)
- Uploads:
  - Photo ID (passport or driving licence)
  - Income proof (3 payslips OR 3 months bank statements)
  - Reference letter from previous landlord (optional)
- Message: reason for moving, ideal move-in date, pets (yes/no)
- Submits → confirmation email sent to applicant

#### Step 3: AI Screening (Paid — £15 Screening Pack)
Triggered when landlord clicks "Screen applicant":
- Stripe payment or existing credit checked
- POST to `/api/ai/screen-applicant` with uploaded documents
- Claude analyses:
  - Income verification (extract stated income from payslips/bank statements)
  - Affordability check (rent should be ≤35% of monthly income)
  - Document quality (complete / unclear / missing)
- Returns structured summary:
  ```
  Income: £3,200/mo confirmed ✅
  Affordability: Rent = 31% of income (threshold <35%) ✅
  Documents: Complete ✅
  Flags: None
  ```
- AI score: GREEN / AMBER / RED
- Summary stored on Application record

#### Step 4: Landlord Manages Applications
- List view: all applicants, AI score badge, date applied
- Actions per applicant: "Shortlist" / "Reject" / "Accept"
- Rejection: auto-email sent to applicant (polite template)
- Accept one → others auto-rejected with email notifications
- Property status → OFFER_ACCEPTED

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
- Monthly RentPayment records auto-created on tenancy start
- Landlord manually marks "Paid" when payment received
- Automated emails (via Resend):
  - Reminder to tenant: 3 days before due date
  - Alert to landlord: if unpaid on due date
  - Escalation: if still unpaid 7 days after due date
- Dashboard shows red badge on property card if rent overdue

#### Tenant Portal
Accessible via unique link (no login). Tenant can:
- View property details and landlord contact
- Submit maintenance request:
  - Select category: Plumbing / Electrical / Heating / Damp & Mould / Other
  - Write description
  - Upload photos (required for Damp & Mould)
  - Submit → ticket created, landlord notified

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
