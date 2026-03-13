import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email, turnstileToken } = parsed.data

  // Verify Turnstile token
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (secret) {
    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: turnstileToken }),
      },
    )
    const { success } = await verifyRes.json()
    if (!success) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
    }
  }

  // Send OTP via Supabase REST API (same logic as sendOtpDirect)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
  }

  const otpRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
    },
    body: JSON.stringify({ email, create_user: true }),
  })

  if (!otpRes.ok) {
    const otpBody = await otpRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: otpBody.msg || otpBody.error_description || 'Failed to send code' },
      { status: 400 },
    )
  }

  return NextResponse.json({ success: true })
}
