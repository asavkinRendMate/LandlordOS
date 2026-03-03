import { createClient } from '@supabase/supabase-js'

// Browser singleton — safe to import in 'use client' components.
// Uses the public anon key; row-level security enforces data access rules.
// Does NOT import lib/env.ts — that module pulls in server-only secrets.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
