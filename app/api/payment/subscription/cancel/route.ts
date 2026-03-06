import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { cancelSubscription } from '@/lib/payment-service'

export async function POST() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await cancelSubscription(user.id)
    return NextResponse.json({ data: { message: 'Subscription cancelled' } })
  } catch (err) {
    console.error('[payment/subscription/cancel POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
