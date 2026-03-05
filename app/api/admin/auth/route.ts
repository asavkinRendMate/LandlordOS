import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

// Vercel env vars: ADMIN_USERNAME, ADMIN_PASSWORD
// Set these in Vercel Dashboard → Settings → Environment Variables

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 },
      )
    }

    if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 },
      )
    }

    const response = NextResponse.json({ data: { success: true } })
    response.cookies.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ data: { success: true } })
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
