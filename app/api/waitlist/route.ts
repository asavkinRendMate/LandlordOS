import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const VALID_PROPERTY_COUNTS = ['1', '2-3', '4-10', '10+'] as const

const schema = z.object({
  email: z.string().email('Invalid email address'),
  propertyCount: z.enum(VALID_PROPERTY_COUNTS),
})

// Postgres unique-constraint violation code
const PG_UNIQUE_VIOLATION = '23505'

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request. Please check your details and try again.' },
        { status: 400 },
      )
    }

    const { email, propertyCount } = result.data
    const supabase = createServerClient()

    const { error } = await supabase
      .from('waitlist')
      .insert({ email, property_count: propertyCount })

    if (error) {
      if (error.code === PG_UNIQUE_VIOLATION) {
        // Graceful — don't reveal whether an email is registered
        return NextResponse.json({ success: true, alreadyRegistered: true })
      }
      console.error('[waitlist POST] Insert error:', error)
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[waitlist POST] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
