import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session if expired — required for Server Components to read it.
  // IMPORTANT: do not use getSession() here — it's not reliable in middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Admin panel auth guard (separate from Supabase auth)
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const adminSession = request.cookies.get('admin_session')?.value
    if (adminSession !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Redirect unauthenticated users away from protected areas
  if ((path.startsWith('/dashboard') || path.startsWith('/tenant/dashboard')) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from the login page
  if (path === '/login' && user) {
    const next = request.nextUrl.searchParams.get('next')
    // Only allow relative paths to prevent open redirect
    const destination = next?.startsWith('/') ? next : '/dashboard'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // Prevent Cloudflare / CDN caching on authenticated or dynamic pages
  if (
    path.startsWith('/dashboard') ||
    path.startsWith('/tenant') ||
    path.startsWith('/sign') ||
    path.startsWith('/apply') ||
    path.startsWith('/admin')
  ) {
    supabaseResponse.headers.set('Cache-Control', 'no-store, private')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|og-image.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
