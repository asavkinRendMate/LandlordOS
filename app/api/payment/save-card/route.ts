import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'

const schema = z.object({
  setupIntentId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Retrieve the SetupIntent from Stripe (server-side, trusted)
    const setupIntent = await stripe.setupIntents.retrieve(result.data.setupIntentId, {
      expand: ['payment_method'],
    })

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'SetupIntent has not succeeded' }, { status: 400 })
    }

    const pm = setupIntent.payment_method
    if (!pm || typeof pm === 'string') {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 400 })
    }

    const card = pm.card
    if (!card) {
      return NextResponse.json({ error: 'No card details on payment method' }, { status: 400 })
    }

    // Ensure Stripe customer exists
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    })
    const customerId = await getOrCreateStripeCustomer(user.id, dbUser?.email ?? user.email!)

    // Attach PM to customer if not already attached
    if (pm.customer !== customerId) {
      try {
        await stripe.paymentMethods.attach(pm.id, { customer: customerId })
      } catch (err) {
        // Already attached is fine
        const msg = err instanceof Error ? err.message : ''
        if (!msg.includes('already been attached')) throw err
      }
    }

    // Set as default payment method on Stripe customer
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pm.id },
    })

    // Save to DB (same fields as webhook — idempotent)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripePaymentMethodId: pm.id,
        paymentMethodStatus: 'SAVED',
        cardLast4: card.last4,
        cardBrand: card.brand ?? 'card',
        cardExpiry: `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}`,
      },
    })

    return NextResponse.json({ data: { message: 'Card saved' } })
  } catch (err) {
    console.error('[payment/save-card POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
