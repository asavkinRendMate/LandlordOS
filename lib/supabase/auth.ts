import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cookie-based auth client for Server Components and Route Handlers.
// Reads the user's session from cookies — uses the anon key (not service role).
// Use this anywhere you need to know who the logged-in user is.
export function createAuthClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // The middleware handles refreshing the session.
          }
        },
      },
    },
  )
}
