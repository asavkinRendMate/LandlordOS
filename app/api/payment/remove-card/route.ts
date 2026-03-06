import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { removeCard } from '@/lib/payment-service'

export async function POST() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await removeCard(user.id)
    return NextResponse.json({ data: { message: 'Card removed' } })
  } catch (err) {
    console.error('[payment/remove-card POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
