import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe/webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // ── Phase 1: Card setup ───────────────────────────────────────────
      case 'setup_intent.succeeded': {
        console.log('[stripe/webhook] setup_intent.succeeded received', event.id)
        const setupIntent = event.data.object as Stripe.SetupIntent
        const pmId = typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id

        if (!pmId) break

        const paymentMethod = await stripe.paymentMethods.retrieve(pmId)
        const card = paymentMethod.card

        if (!card) break

        const customerId = typeof setupIntent.customer === 'string'
          ? setupIntent.customer
          : setupIntent.customer?.id

        if (!customerId) break

        await prisma.user.update({
          where: { stripeCustomerId: customerId },
          data: {
            stripePaymentMethodId: pmId,
            paymentMethodStatus: 'SAVED',
            cardLast4: card.last4,
            cardBrand: card.brand ?? 'card',
            cardExpiry: `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}`,
          },
        })

        // Set as default payment method on the customer
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: pmId },
        })

        console.log(`[stripe/webhook] setup_intent.succeeded: customer=${customerId} pm=${pmId}`)
        break
      }

      // ── Phase 2 (TODO): Subscription lifecycle ────────────────────────
      case 'customer.subscription.updated': {
        // TODO Phase 2 — sync subscription status to DB
        console.log(`[stripe/webhook] customer.subscription.updated (not yet handled)`)
        break
      }

      case 'customer.subscription.deleted': {
        // TODO Phase 2 — mark subscription as cancelled
        console.log(`[stripe/webhook] customer.subscription.deleted (not yet handled)`)
        break
      }

      case 'invoice.payment_failed': {
        // TODO Phase 2 — mark subscription as PAST_DUE
        console.log(`[stripe/webhook] invoice.payment_failed (not yet handled)`)
        break
      }

      // ── Phase 3 (TODO): Screening unlock ──────────────────────────────
      case 'payment_intent.succeeded': {
        // TODO Phase 3 — screening report unlock
        console.log(`[stripe/webhook] payment_intent.succeeded (not yet handled)`)
        break
      }

      // ── Phase 4 (TODO): Credit pack purchase ──────────────────────────
      case 'checkout.session.completed': {
        // TODO Phase 4 — credit pack fulfilment
        console.log(`[stripe/webhook] checkout.session.completed (not yet handled)`)
        break
      }

      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`)
    }
  } catch (err) {
    console.error(`[stripe/webhook] Error handling ${event.type}:`, err)
    // Return 200 anyway to prevent Stripe retries for handler errors
    // (Stripe would re-send on 5xx, causing duplicate processing)
  }

  return NextResponse.json({ received: true })
}
