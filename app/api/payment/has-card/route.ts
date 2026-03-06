import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { hasCard } from '@/lib/payment-service'

export async function GET() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await hasCard(user.id)
    return NextResponse.json({ data: { hasCard: result } })
  } catch (err) {
    console.error('[payment/has-card GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
