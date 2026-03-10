import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'

export async function POST() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email!)

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({
      data: { clientSecret: setupIntent.client_secret },
    })
  } catch (err) {
    console.error('[payment/setup-intent POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
