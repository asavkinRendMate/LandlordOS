# SPEC.md — Product Specification

## Product Vision & Target User

**LetSorted** (letsorted.co.uk) — Simple property management for UK self-managing landlords.

**Target:** 1–5 property landlords managing independently (~1.4M in UK). Currently using spreadsheets, folders, and WhatsApp.

**Core Value:** Complete tenant lifecycle management — applications, AI screening, documents, rent tracking, maintenance, inspection evidence reports, and RRA 2025 compliance in one clean interface.

**Positioning:** Only product combining landlord compliance + AI financial screening + dual-confirmation inspection evidence system + tenant portal designed specifically for small-portfolio self-managers (not lettings agents).

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

### Pay-Per-Use (future)
| Feature | Price | Status |
|---------|-------|--------|
| APT Contract Generation | £10 | NOT STARTED |
| Inventory Report PDF | £5 | NOT STARTED |
| Dispute Evidence Pack | £29 | NOT STARTED |

---

## Feature List with Status

### Core Platform
| Feature | Status | Notes |
|---------|--------|-------|
| OTP Auth (Supabase) | LIVE | 6-digit code via email |
| Demo Login Buttons | LIVE | Env-var gated |
| Property Management | LIVE | Address, type, bedrooms, status |
| Delete Property | LIVE | Type-to-confirm modal, cascade delete |
| Property Rooms Setup | LIVE | Used by inspection reports |
| Onboarding Wizard | LIVE | 5 steps: Address → Rooms → Occupancy → Tenant → Done |
| Name Capture Modal | LIVE | Undismissable on first login |
| Settings Page | LIVE | Display name edit, user profile |
| Admin Panel | LIVE | Cookie-based auth, user/property/screening CRUD |

### Tenant Pipeline
| Feature | Status | Notes |
|---------|--------|-------|
| Public Application Form | LIVE | `/apply/[propertyId]` |
| Multi-email Invite UI | LIVE | Up to 10 emails, cost preview |
| Tenant Status Pipeline | LIVE | CANDIDATE → INVITED → TENANT → FORMER_TENANT |
| Tenant Onboarding | LIVE | `/tenant/join/[token]` confirmation flow |
| Select Tenant Flow | LIVE | 2-step confirmation + rejection emails |
| Application History | LIVE | Collapses when tenant active |
| Tenant Portal Link | LIVE | Copyable + email invitation |

### AI Financial Screening
| Feature | Status | Notes |
|---------|--------|-------|
| Screening Invite Flow | LIVE | Invite → upload → AI → unlock |
| Joint Application Support | LIVE | Household income summing |
| AI Scoring Engine | LIVE | 32 rules, 6 categories, 0–100 score |
| Name Verification | LIVE | Claude Haiku + Levenshtein fallback |
| Period Validation | LIVE | ≥60 days coverage, ≤6 months old |
| Server-side Validation | LIVE | Affordability + threshold rules |
| Director's Loan Exclusion | LIVE | Excluded from debt calculation |
| Deduplication Logic | LIVE | Gambling + income discrepancy |
| Report Unlock | LIVE | MOCK_PAID — Stripe integration pending |
| Public Verification | LIVE | `/verify/[token]` pages |
| Credit Pack Flow | LIVE | Standalone entry for non-subscribers |
| Background Processing | LIVE | Fire-and-forget scoring with 60s timeout |

### Document Management
| Feature | Status | Notes |
|---------|--------|-------|
| Property Documents | LIVE | 14 types, expiry tracking |
| Tenant Documents | LIVE | 9 types, dual-party upload |
| Document Acknowledgment | LIVE | Tenant review system |
| Compliance Dashboard | LIVE | Gas/EPC/EICR/H2R status tracking |
| File Upload Modal | LIVE | Drag-drop, progress indicator |

### Financial Management
| Feature | Status | Notes |
|---------|--------|-------|
| Rent Payment Tracking | LIVE | Manual landlord entry |
| Payment Status Pipeline | LIVE | PENDING → EXPECTED → RECEIVED/LATE/PARTIAL |
| Auto-payment Generation | LIVE | Next 3 months (idempotent) |
| Stripe Card Setup | LIVE | SetupIntent + Elements integration |
| Subscription Management | MOCK | Card saved, charges/subscriptions mocked |
| Payment History | LIVE | Stripe PaymentIntent tracking |

### Maintenance
| Feature | Status | Notes |
|---------|--------|-------|
| Maintenance Requests | LIVE | Tenant submission + landlord management |
| Photo Upload | LIVE | Resize/compress, both parties |
| Priority Levels | LIVE | URGENT/HIGH/MEDIUM/LOW |
| Status Tracking | LIVE | OPEN → IN_PROGRESS → RESOLVED |
| Awaab's Law Timer | LIVE | DAMP_MOULD 24h response deadline |
| Status History | LIVE | Immutable audit trail |

### Property Inspections
| Feature | Status | Notes |
|---------|--------|-------|
| Move-in Reports | LIVE | Room-by-room photo documentation |
| Tenant Review Flow | LIVE | Token-based, no login required |
| Dual Confirmation | LIVE | Both parties must agree |
| PDF Generation | LIVE | All photos attributed by uploader |
| Status Machine | LIVE | DRAFT → PENDING → IN_REVIEW → AGREED/DISPUTED |
| Move-in Email | LIVE | PDF + compliance docs |
| Periodic Inspections | LIVE | 3/6 month schedule, tenant notices |
| Schedule Management | LIVE | Per-tenancy frequency control |
| Notice System | LIVE | Legal requirement (Section 11, LTA 1985) |
| Inspection Types | LIVE | MOVE_IN, PERIODIC, MOVE_OUT |

### Tenant Portal
| Feature | Status | Notes |
|---------|--------|-------|
| Document Access | LIVE | View, acknowledge, upload |
| Maintenance Submission | LIVE | With photo upload |
| Rent Payment View | LIVE | Read-only history |
| Inspection Review | LIVE | Photo upload + confirmation |
| Onboarding Checklist | LIVE | R2R, deposit, rent, agreement |
| Portal Dashboard | LIVE | Unified tenant interface |

### Tenancy Management
| Feature | Status | Notes |
|---------|--------|-------|
| Deposit Tracking | LIVE | Amount, scheme, protection alerts |
| Tenancy Status | LIVE | PENDING → ACTIVE → NOTICE_GIVEN → ENDED |
| Contract System | LIVE | Generation, signing workflow |
| Contract Upload | LIVE | Alternative to generation |
| Rent Payment Cycles | LIVE | Auto-generation based on payment day |
| APT Contract Generation | NOT STARTED | Pay-per-use feature |
| Section 13/8 Notices | NOT STARTED | RRA 2025 compliance |

### Notifications & Alerts
| Feature | Status | Notes |
|---------|--------|-------|
| Email Templates | LIVE | 9 templates via Resend |
| Notifications Registry | LIVE | Admin panel management |
| Compliance Alerts | LIVE | Daily 9am UTC cron |
| Rent Reminders | LIVE | Daily 8am UTC cron |
| Maintenance Notifications | LIVE | Status updates, Awaab's Law |
| Inspection Notifications | LIVE | Review requests, confirmations |
| Awaab's Law Alerts | LIVE | 4-hour before deadline |

### Analytics & Monitoring
| Feature | Status | Notes |
|---------|--------|-------|
| Google Analytics | LIVE | Consent Mode v2 |
| Microsoft Clarity | LIVE | Consent-gated |
| Facebook Pixel | LIVE | Consent-gated |
| Cookie Consent | LIVE | vanilla-cookieconsent |
| Sentry Error Tracking | LIVE | Client + server + edge |
| PostHog Analytics | LIVE | EU residency, consent-gated |
| Crisp Live Chat | LIVE | Support integration |

### SEO & Content
| Feature | Status | Notes |
|---------|--------|-------|
| Dynamic Sitemap | LIVE | Auto-generated |
| JSON-LD Schema | LIVE | Structured data |
| OG Images | LIVE | Social media previews |
| Guides/Blog | LIVE | MDX-based content |
| Feature Pages | LIVE | 5 marketing pages |
| RRA 2025 Hub | LIVE | Compliance information |

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

### Tenant Screening Flow
```
Landlord enters emails + rent → invites sent
↓
Candidate uploads bank statements → background AI processing
↓
AI: name verify → period validate → score 0–100 → generate report
↓
Landlord notified → pays to unlock → selects tenant
↓
Winner notified → rejections sent → property status ACTIVE
```

### Inspection Report Flow
```
Rooms configured → landlord creates report
↓
Room-by-room photos + conditions → send to tenant
↓
Tenant reviews + adds photos → confirms
↓
Landlord confirms → PDF generated → emailed to both
```

### Tenant Lifecycle
```
VACANT → application/invite → CANDIDATE → screening
↓
Selected → INVITED → joins portal → TENANT
↓
Portal access: docs, maintenance, rent, inspections
```

---

## Technical Architecture

### Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 5.22 |
| Auth | Supabase Auth (6-digit OTP) |
| Storage | Supabase Storage (5 buckets) |
| Email | Resend |
| Payments | Stripe (card setup live, charges mocked) |
| AI | Claude Sonnet + Haiku |
| PDF | pdf-lib |
| Styling | Tailwind + shadcn/ui |
| Hosting | Vercel |

### Storage Architecture
| Bucket | Purpose | Path Pattern |
|---------|---------|-------------|
| `documents` | Property docs + PDFs | `/{userId}/{propertyId}/{docId}/{filename}` |
| `tenant-documents` | Tenant uploads | `/{propertyId}/{tenantId}/{docId}/{filename}` |
| `maintenance-photos` | Maintenance images | `/{requestId}/{role}/{photoId}-{filename}` |
| `bank-statements` | Screening PDFs | `/{reportId}/{filename}` |
| `check-in-photos` | Inspection photos | `/{propertyId}/{reportId}/{roomId}/{photoId}-{filename}` |

All URLs: signed, 60-minute expiry.

### API Architecture
- **Public routes:** Application forms, verification pages, contract signing
- **Auth-gated:** Dashboard, property management, tenant portal
- **Admin-gated:** User management, screening logs, system notifications
- **Cron routes:** Compliance alerts, rent reminders, Awaab's Law
- **Webhook:** Stripe payment processing

### Key Business Logic Files
| File | Purpose |
|------|---------|
| `lib/scoring/engine.ts` | AI financial analysis |
| `lib/pdf-engine/` | Isolated PDF generation module |
| `lib/email-templates/` | All notification templates |
| `lib/payment-service.ts` | Payment processing (mocked) |
| `lib/screening-pricing.ts` | Pack definitions + pricing |
| `lib/inspection-storage.ts` | Inspection photo management |
| `lib/maintenance-storage.ts` | Maintenance photo management |

---

## Compliance & Legal

### Renters' Rights Act 2025
- **Effective:** 1 May 2026
- **Key changes:** Section 21 abolished, APT conversion, Section 13 rent increases only
- **Fines:** Up to £40,000 for 15 new offences
- **Implementation:** All contracts generated as APT, Section 8 possession only

### Awaab's Law (Social Housing Regulation Act 2023)
- **DAMP_MOULD category:** Auto-sets 24h response deadline
- **Monitoring:** 4-hour reminder cron, compliance tracking
- **Alerts:** Automatic landlord notifications

### GDPR Compliance
- **Data retention:** Inspection photos (tenancy + 3 months)
- **Privacy:** Signed URLs, 60-minute expiry
- **Analytics:** PostHog EU, consent-gated tracking
- **Storage:** Encrypted at rest

### Deposit Protection
- **Deadline:** 30 days from receipt
- **Schemes:** TDS, DPS, MyDeposits tracking
- **Alerts:** Automated compliance reminders
- **Status:** Protection timestamp recording

---

## Business Rules

### Pricing & Billing
- Free tier: 1 property forever (acquisition strategy)
- Subscription: £9.99/month per additional property
- Screening: First unlock £9.99, additional £1.49 per cycle
- Credit packs: Never expire, balances accumulate

### Screening Lifecycle
- Invite expiry: 7 days (lazily updated to EXPIRED)
- Cycle reset: When property returns to VACANT
- Financial verification: Default enabled for new properties
- Background processing: 60-second timeout, fire-and-forget

### Document Management
- All uploads: Drag-drop, progress indicators
- Expiry tracking: Automated alerts for compliance docs
- Acknowledgment: Required for tenant document review
- Retention: Per GDPR guidelines

### Inspection Requirements
- PDF generation: Only when both parties confirm
- Photo inclusion: ALL photos regardless of status
- Legal notices: Required for periodic inspections
- Status progression: Immutable state machine

---

## Integration Points

### External Services
| Service | Purpose | Status |
|---------|---------|--------|
| Supabase | Database, Auth, Storage | LIVE |
| Stripe | Payments, Subscriptions | PARTIAL (setup live, charges mocked) |
| Resend | Email delivery | LIVE |
| Claude API | AI scoring, name verification | LIVE |
| OS Places | Address validation | LIVE |
| Crisp | Live chat support | LIVE |

### Webhook Handlers
- **Stripe:** Payment confirmation, subscription updates
- **Supabase:** Auth state changes (future)

### Cron Jobs
- **Compliance alerts:** Daily 9am UTC
- **Rent reminders:** Daily 8am UTC  
- **Awaab's Law:** Every 15 minutes
- **Inspection schedules:** Daily check for due dates
- **Demo cleanup:** User data purging

---

## Development Guidelines

### What NOT to Do
- Never use magic link auth (corporate email pre-click issue)
- Never store monetary amounts as floats (always pence integers)
- Never expose service role keys to browser
- Never skip API route validation
- Never show grades/"/100" to screening candidates
- Never generate legal text from scratch (templates only)
- Never call AI analysis directly in upload routes (use fire-and-forget)
- Never modify PDF engine types.ts destructively (additive only)
- Never import from PDF engine internals (use index.ts only)

### Best Practices
- Use Zod validation with `error:` not `errorMap:`
- Maintain immutable audit trails for sensitive actions
- Implement proper error boundaries and toast notifications
- Follow PostHog EU residency for analytics
- Use signed URLs with 60-minute expiry for all file access
- Implement proper loading states for async operations