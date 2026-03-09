# SPEC.md — Product Specification

## Product Vision & Target User

**LetSorted** (letsorted.co.uk) — Simple property management for UK self-managing landlords.

**Target:** 1–5 property landlords managing independently (1.4M in UK). Currently using spreadsheets, folders, and WhatsApp.

**Core Value:** Complete tenant lifecycle management — applications, documents, rent tracking, maintenance, and RRA 2025 compliance in one clean interface.

**Positioning:** Only product combining landlord compliance + tenant onboarding + tenant portal designed specifically for small-portfolio self-managers (not lettings agents).

---

## Pricing Model

### Subscription
- **1 property: FREE forever** (acquisition)
- **2+ properties: £10/month per property**

### Pay-Per-Use Features
| Feature | Price | Status |
|---------|-------|---------|
| AI Financial Scoring | £15 | LIVE |
| APT Contract Generation | £10 | NOT STARTED |
| Inventory Report PDF | £5 | NOT STARTED |
| Dispute Evidence Pack | £29 | NOT STARTED |

**Payment:** Stripe (subscriptions via Billing Portal, one-time via Payment Intents)

---

## Feature List with Status

### Core Platform
| Feature | Status | Notes |
|---------|--------|-------|
| Magic Link Auth (Supabase) | LIVE | Email-based, no passwords |
| Demo Login Buttons | LIVE | Landlord + tenant demo access, env-var gated (`NEXT_PUBLIC_DEMO_*_PASSWORD`) |
| Property Management | LIVE | Address, type, bedrooms (synced picker), rooms, status tracking |
| Multi-tenant Dashboard | LIVE | Landlord + tenant context switching |
| Document Storage | LIVE | Supabase Storage, signed URLs |
| Admin Panel | LIVE | User/property management, notifications registry |

### Tenant Pipeline
| Feature | Status | Notes |
|---------|--------|-------|
| Public Application Form | LIVE | `/apply/[propertyId]` |
| Tenant Invitation System | LIVE | Email invites + join tokens |
| Tenant Status Pipeline | LIVE | CANDIDATE → INVITED → TENANT |
| Tenant Onboarding | LIVE | `/tenant/join/[token]` flow |
| AI Screening Integration | PRE-LAUNCH | Stripe payment not connected |

### Document Management
| Feature | Status | Notes |
|---------|--------|-------|
| Property Documents | LIVE | 14 types, expiry tracking |
| Tenant Documents | LIVE | 9 types, upload by both parties |
| Document Acknowledgment | LIVE | Tenant "mark as reviewed" |
| Compliance Dashboard | LIVE | Gas/EPC/EICR/H2R status cards |
| AI Date Extraction | NOT STARTED | Claude extraction from PDFs |

### Financial Management
| Feature | Status | Notes |
|---------|--------|-------|
| AI Financial Scoring | LIVE | Bank statement analysis |
| Scoring Verification | LIVE | Public `/verify/[token]` pages |
| Rent Payment Tracking | LIVE | Manual landlord entry |
| Payment Status Pipeline | LIVE | PENDING → EXPECTED → RECEIVED/LATE |
| GoCardless Integration | NOT STARTED | Auto-collect rent |

### Maintenance
| Feature | Status | Notes |
|---------|--------|-------|
| Maintenance Requests | LIVE | Tenant submission, landlord management |
| Photo Upload System | LIVE | Both parties can attach photos |
| Priority Management | LIVE | LOW/MEDIUM/HIGH/URGENT |
| Status Tracking | LIVE | OPEN → IN_PROGRESS → RESOLVED |
| Awaab's Law Timer | LIVE | 24h damp/mould response, 4h email reminder cron (every 15min) |

### Tenancy Management
| Feature | Status | Notes |
|---------|--------|-------|
| Deposit Tracking | LIVE | Amount, scheme, protection status |
| Check-in Reports | LIVE | Room-by-room photo system |
| Contract Generation | NOT STARTED | APT template + e-signatures |
| Section 13 Notices | NOT STARTED | Rent increase workflow |
| Section 8 Notices | NOT STARTED | Possession grounds system |

### Tenant Portal
| Feature | Status | Notes |
|---------|--------|-------|
| Document Access | LIVE | View/acknowledge property docs |
| Document Upload | LIVE | Upload own ID/income docs |
| Maintenance Submission | LIVE | Create requests with photos |
| Rent Payment View | LIVE | Read-only payment history |
| Check-in Inspection | LIVE | View/confirm/dispute check-in reports, photo upload with condition + comment |
| Notice Period | NOT STARTED | Tenant-initiated termination |

### Notifications & Alerts
| Feature | Status | Notes |
|---------|--------|-------|
| Email Templates | LIVE | Resend integration, 20 templates |
| Notifications Registry | LIVE | `lib/notifications/registry.ts` — 28 notifications, admin panel at `/admin/notifications` |
| Compliance Alerts | LIVE | Daily cron (9am UTC) — 30d/7d/expired doc warnings + deposit protection reminders |
| Maintenance Notifications | LIVE | New request, tenant confirmation, status updates (landlord + tenant), Awaab's Law 4h reminder |
| Rent Reminders | LIVE | Daily cron (8am UTC) — 5-day reminder, due-today, overdue (daily up to 7 days) |

---

## User Flows

### Landlord Onboarding
```
Email → Magic Link → Name + Property Count → Dashboard
↓
Add Property → Address + Type + Bedrooms → Configure Rooms → Compliance Checklist Created
↓
Upload Documents → Gas/EPC/EICR/H2R → Status Cards Update
```

### Tenant Lifecycle
```
VACANT Property → Generate Application Link → Share with Prospects
↓
Applicant Completes `/apply/[propertyId]` → Status: CANDIDATE
↓
Landlord Reviews → Send Invite → Status: INVITED → Email Sent
↓
Tenant Clicks `/tenant/join/[token]` → Confirms Details → Status: TENANT
↓
Tenant Portal Access → Upload Documents → Maintenance Requests
```

### Screening Flow
```
Bank Statement Upload → AI Analysis (Claude) → Score 0-100 + Grade
↓
Verification Token Generated → Public `/verify/[token]` Page
↓
Landlord Decision → Accept/Reject → Move-in Process
```

---

## Technical Architecture

### Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Auth:** Supabase Auth (magic links)
- **Storage:** Supabase Storage (documents, photos)
- **Email:** Resend
- **Payments:** Stripe
- **AI:** Anthropic Claude (financial analysis)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

### Hosting & Infrastructure
- **Frontend:** Vercel
- **Database:** Supabase (managed PostgreSQL)
- **File Storage:** Supabase Storage
- **CDN:** Vercel Edge Network
- **Environment:** Production + Preview branches

### Authentication & Authorization
- **Method:** Supabase Auth magic links (passwordless)
- **Session:** HTTP-only cookies via `@supabase/ssr`
- **RLS:** Row Level Security on all tables
- **Multi-role:** Single user can be both landlord and tenant

### Storage Strategy
| Bucket | Path Pattern | Access |
|--------|-------------|--------|
| `property-documents` | `/{propertyId}/{docId}/{filename}` | Private (signed URLs) |
| `tenant-documents` | `/{propertyId}/{tenantId}/{docId}/{filename}` | Private (signed URLs) |
| `maintenance-photos` | `/{requestId}/{role}/{photoId}-{filename}` | Private (signed URLs) |
| `bank-statements` | `/{reportId}/{filename}` | Private (scoring only) |
| `check-in-photos` | `/{reportId}/{roomId}/{photoId}` | Private (signed URLs) |

### Payment Architecture
- **Subscriptions:** Stripe Billing Portal
- **One-time:** Payment Intents
- **Webhook:** `/api/webhooks/stripe` (subscription events)
- **Customer:** 1:1 mapping with User via `stripeCustomerId`

---

## Compliance & Legal

### Renters' Rights Act 2025
- **Effective:** 1 May 2026
- **Section 21 Abolition:** All notices must use Section 8 grounds with evidence
- **Periodic Tenancies:** All ASTs convert to Assured Periodic Tenancies
- **Rent Increases:** Maximum once per year via Section 13 Notice
- **New Offences:** 15 new offences, fines up to £40,000

### Deposit Protection
- **Schemes:** DPS, MyDeposits, TDS integration
- **Timeline:** 30-day protection deadline enforced
- **Alerts:** Automated warnings for unprotected deposits

### Awaab's Law (Private Rentals)
- **Scope:** Damp and mould complaints
- **Response Time:** 24 hours maximum
- **Implementation Status:** LIVE — `respondBy` auto-set on DAMP_MOULD requests, 4h email reminder via cron (`/api/cron/awaabs`, every 15min)
- **Compliance:** Maintenance `category` field triggers Awaab's Law timer when set to `DAMP_MOULD`

### Document Requirements
- **Gas Safety:** Annual certificate mandatory
- **EPC:** Valid certificate required
- **EICR:** Every 5 years
- **How to Rent:** Latest government guide
- **Right to Rent:** Tenant verification mandatory

### Data Protection (GDPR)
- **Retention:** Check-in photos deleted 3 months post-tenancy
- **Storage:** All files encrypted at rest (Supabase)
- **Access:** Signed URLs with 60-minute expiry
- **Audit:** Full access logging via Supabase
- **Cookie consent:** `vanilla-cookieconsent` with necessary / analytics / marketing categories
  - Sentry error tracking runs always (legitimate interest)
  - PostHog session recording + pageviews only after analytics consent accepted
  - PostHog uses EU data residency (`eu.i.posthog.com`)

### Monitoring & Analytics
- **Error tracking:** Sentry (`@sentry/nextjs`) — client + server + edge, 10% trace sampling in production
- **Product analytics:** PostHog (`posthog-js`) — pageviews, session recording (consent-gated)
- **User identification:** PostHog `identify()` with Supabase UUID only (no PII) in dashboard layout