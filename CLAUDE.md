# CLAUDE.md — Project Instructions

## Project Overview

UK landlord management SaaS for self-managing landlords. Compliance-first approach built around the Renters' Rights Act 2025 (effective 1 May 2026). Read `SPEC.md` for full product specification and `TASKS.md` for current sprint tasks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth (magic link only — no passwords) |
| Storage | Supabase Storage |
| Email | Resend |
| Payments | Stripe |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Hosting | Vercel |
| Styling | Tailwind CSS + shadcn/ui |

---

## Project Structure

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (magic link flow)
│   │   └── login/
│   ├── (dashboard)/              # Protected landlord dashboard
│   │   ├── layout.tsx            # Dashboard shell with sidebar
│   │   ├── page.tsx              # Overview: all properties
│   │   ├── properties/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx      # Property detail tabs
│   │   │   │   ├── compliance/
│   │   │   │   ├── tenancy/
│   │   │   │   ├── rent/
│   │   │   │   ├── documents/
│   │   │   │   └── maintenance/
│   │   │   └── new/
│   │   └── settings/
│   ├── (tenant)/                 # Tenant-facing pages (no auth)
│   │   ├── apply/[token]/        # Application form
│   │   └── portal/[token]/       # Tenant portal
│   └── api/                      # API routes
│       ├── webhooks/
│       │   ├── stripe/
│       │   └── resend/
│       ├── ai/
│       │   ├── extract-dates/    # Extract expiry dates from PDFs
│       │   └── screen-applicant/ # AI applicant screening
│       └── cron/
│           └── alerts/           # Daily compliance alert job
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── dashboard/                # Dashboard-specific components
│   ├── compliance/               # Compliance tab components
│   ├── tenant/                   # Tenant portal components
│   └── forms/                    # Form components
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server Supabase client
│   ├── resend.ts                 # Email client
│   ├── stripe.ts                 # Stripe client
│   ├── anthropic.ts              # Anthropic client
│   └── utils.ts                  # Shared utilities
├── prisma/
│   ├── schema.prisma             # Single source of truth for DB schema
│   └── migrations/               # Auto-generated migration files
├── emails/                       # React Email templates
│   ├── rent-reminder.tsx
│   ├── maintenance-notification.tsx
│   ├── application-received.tsx
│   └── magic-link.tsx
├── types/
│   └── index.ts                  # Shared TypeScript types
└── middleware.ts                  # Auth middleware (protect /dashboard)
```

---

## Database Schema (Prisma)

See prisma/schema.prisma for DB schema

---

## Key Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Database
npx prisma migrate dev   # Create and apply migration
npx prisma generate      # Regenerate Prisma client after schema change
npx prisma studio        # Open Prisma Studio (DB GUI)
npx prisma db push       # Push schema without migration (dev only)

# Build & Deploy
npm run build            # Production build
npm run lint             # ESLint check
npm run type-check       # TypeScript check (tsc --noEmit)

# Email preview
npm run email            # Preview React Email templates (localhost:3001)
```

---

## Code Conventions

### General
- TypeScript strict mode — no `any`, no `as unknown as`
- All monetary values stored in **pence** (integers), never floats
- All dates stored as `DateTime` (UTC), displayed in UK locale
- Environment variables accessed only via `lib/env.ts` (validated with zod)

### API Routes
- All API routes in `app/api/` return `{ data, error }` shape
- Auth check at the top of every protected route using `getServerSession`
- Input validation with `zod` before any DB operation

### Components
- Server Components by default, `"use client"` only when necessary
- Form state with `react-hook-form` + `zod` resolver
- Loading states with `Suspense` boundaries, not manual `isLoading`

### AI Calls
- All Claude API calls go through `lib/anthropic.ts`
- System prompts stored as constants in `lib/prompts/`
- Never expose raw AI output to users — always parse and validate

### Supabase Storage
- File uploads go through `lib/storage.ts` helper
- Public bucket for: inventory photos, compliance docs
- Path pattern: `/{userId}/{propertyId}/{category}/{filename}`
- Always generate signed URLs for sensitive documents

### Error Handling
- Use `try/catch` in all async server functions
- Log errors with `console.error` including context
- Return user-friendly messages, never expose stack traces

---

## Environment Variables

```env
# Database
DATABASE_URL=              # Supabase connection string (pooled)
DIRECT_URL=                # Supabase direct connection (for migrations)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Email
RESEND_API_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
CRON_SECRET=               # Secret for cron job endpoints
```

---

## Important Business Rules

- **Free tier:** 1 property only. 2+ properties require paid subscription (£10/mo per property)
- **Paid one-time events:** Screening Pack £15, Contract £10, Inventory Report £5, Dispute Pack £29
- **All contracts generated are APT** (Assured Periodic Tenancy) — not AST (abolished May 2026)
- **Rent increases:** only once per year via Section 13 Notice — enforce this in UI
- **Awaab's Law:** DAMP_MOULD tickets automatically set `respondBy = createdAt + 24 hours`
- **Deposit deadline:** 30 days from tenancy start date — alert landlord if unprotected
- **Tenant notice period:** minimum 2 months — validate before allowing submission
- **Magic link only:** no password auth, no social login

## What NOT to Do

- Never store passwords — auth is magic link via Supabase
- Never generate legal text from scratch — AI fills pre-approved templates only
- Never expose Supabase service role key to the browser
- Never store monetary amounts as floats — always pence integers
- Never skip input validation on API routes
- Never use `prisma.$executeRaw` without parameterized queries
