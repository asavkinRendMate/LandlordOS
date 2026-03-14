import { z } from 'zod'

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  OS_API_KEY: z.string().min(1, 'OS_API_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_SUBSCRIPTION_PRICE_ID: z.string().min(1).optional(),

  // Sentry (server-only — NEXT_PUBLIC_SENTRY_DSN read via process.env in config files)
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // Internal secret for fire-and-forget API calls (e.g. PDF generation)
  INTERNAL_SECRET: z.string().min(1).optional(),

  // MailerLite (onboarding email sequence)
  MAILERLITE_API_KEY: z.string().optional(),
  MAILERLITE_GROUP_ID: z.string().optional(),
})

// Throws at startup if any required variable is missing or malformed.
// Import this only from server-side modules — never from 'use client' files.
//
// Client-side env vars (read via process.env.NEXT_PUBLIC_* in 'use client' files):
//   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — required for Stripe Elements (PaymentSetupModal)
//   NEXT_PUBLIC_DEMO_LANDLORD_PASSWORD — optional, demo login button password
//   NEXT_PUBLIC_DEMO_TENANT_PASSWORD   — optional, demo login button password
//   Demo buttons only visible on login page when BOTH are set and non-empty.
export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  OS_API_KEY: process.env.OS_API_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_SUBSCRIPTION_PRICE_ID: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  INTERNAL_SECRET: process.env.INTERNAL_SECRET,
  MAILERLITE_API_KEY: process.env.MAILERLITE_API_KEY,
  MAILERLITE_GROUP_ID: process.env.MAILERLITE_GROUP_ID,
})
