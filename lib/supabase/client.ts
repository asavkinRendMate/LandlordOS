import { createBrowserClient } from '@supabase/ssr'

// Browser client — safe to import in 'use client' components.
// Uses @supabase/ssr so the session is stored in cookies and is visible
// to Server Components and middleware (unlike localStorage-based storage).
// Does NOT import lib/env.ts — that module pulls in server-only secrets.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
