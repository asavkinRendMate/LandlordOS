import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'

export async function POST() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo accounts cannot add real payment methods
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isDemo: true },
    })
    if (dbUser?.isDemo) {
      return NextResponse.json({ error: 'Payment methods are not available in demo mode' }, { status: 403 })
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email!)

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card'],
    })

    return NextResponse.json({
      data: { clientSecret: setupIntent.client_secret },
    })
  } catch (err) {
    console.error('[payment/setup-intent POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
