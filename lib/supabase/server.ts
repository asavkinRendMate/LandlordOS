import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Factory — create a new client per request; never use as a singleton.
// Uses the service role key which bypasses RLS — for trusted server operations only.
// Never import this file from 'use client' components or expose to the browser.
export function createServerClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
