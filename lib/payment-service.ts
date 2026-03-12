/**
 * Payment Service — Real Stripe Integration (Phase 2)
 *
 * ALL payment logic lives here — UI never calls Stripe directly.
 *
 * Stripe Integration Status
 * - [x] saveCard() — Stripe SetupIntent + PaymentElement (Phase 1)
 * - [x] removeCard() — Stripe PaymentMethod detach (Phase 1)
 * - [x] Stripe webhook handler — /api/stripe/webhook (Phase 1)
 * - [x] Stripe Customer creation — lib/stripe.ts getOrCreateStripeCustomer() (Phase 1)
 * - [x] charge() — Stripe PaymentIntent create + confirm (Phase 2)
 * - [x] createOrUpdateSubscription() — Stripe Subscription create/update (Phase 2)
 * - [x] cancelSubscription() — Stripe Subscription cancel (Phase 2)
 */

import { prisma } from '@/lib/prisma'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'
import { env } from '@/lib/env'

// ── Charge reasons & amounts ─────────────────────────────────────────────────

export type ChargeReason =
  | 'SCREENING_FIRST'
  | 'SCREENING_ADDITIONAL'
  | 'STANDALONE_SCREENING'
  | 'APT_CONTRACT'
  | 'SECTION_13_NOTICE'
  | 'DISPUTE_PACK'

export const CHARGE_AMOUNTS: Record<ChargeReason, number> = {
  SCREENING_FIRST: 999,       // £9.99
  SCREENING_ADDITIONAL: 149,  // £1.49
  STANDALONE_SCREENING: 1199, // £11.99
  APT_CONTRACT: 999,          // £9.99
  SECTION_13_NOTICE: 499,     // £4.99
  DISPUTE_PACK: 2999,         // £29.99
}

// ── Subscription pricing ─────────────────────────────────────────────────────

const PER_PROPERTY_MONTHLY_PENCE = 999 // £9.99/mo per additional property

// ── Card management ──────────────────────────────────────────────────────────

export async function saveCard(
  userId: string,
  card: { last4: string; brand: string; expiry: string },
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      paymentMethodStatus: 'SAVED',
      cardLast4: card.last4,
      cardBrand: card.brand,
      cardExpiry: card.expiry,
    },
  })
}

export async function removeCard(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      paymentMethodStatus: 'NONE',
      cardLast4: null,
      cardBrand: null,
      cardExpiry: null,
      stripePaymentMethodId: null,
    },
  })
}

export async function hasCard(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paymentMethodStatus: true },
  })
  return user?.paymentMethodStatus === 'SAVED'
}

// ── Charging (real Stripe PaymentIntent) ─────────────────────────────────────

export async function charge(
  userId: string,
  reason: ChargeReason,
  amountPence: number,
  referenceId?: string,
): Promise<{ success: boolean; chargeId: string; paymentId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeCustomerId: true,
      stripePaymentMethodId: true,
      paymentMethodStatus: true,
      email: true,
    },
  })

  if (!user || user.paymentMethodStatus !== 'SAVED' || !user.stripePaymentMethodId) {
    throw new Error('No payment method on file')
  }

  // Ensure Stripe customer exists
  const customerId = user.stripeCustomerId ?? await getOrCreateStripeCustomer(userId, user.email)

  // Create Payment record (pending)
  const payment = await prisma.payment.create({
    data: {
      userId,
      amountPence,
      reason,
      status: 'pending',
      referenceId: referenceId ?? null,
      metadata: { reason },
    },
  })

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: 'gbp',
      customer: customerId,
      payment_method: user.stripePaymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        userId,
        reason,
        referenceId: referenceId ?? '',
        paymentId: payment.id,
      },
    })

    // Update Payment record with Stripe ID and success status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        status: 'succeeded',
      },
    })

    console.log(
      `[payment-service] Charge succeeded: user=${userId} reason=${reason} amount=£${(amountPence / 100).toFixed(2)} pi=${paymentIntent.id}`,
    )

    return { success: true, chargeId: paymentIntent.id, paymentId: payment.id }
  } catch (err) {
    // Update Payment record as failed
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    })

    console.error(`[payment-service] Charge failed: user=${userId} reason=${reason}`, err)
    throw err
  }
}

// ── Subscriptions (real Stripe) ──────────────────────────────────────────────

export async function createOrUpdateSubscription(
  userId: string,
  propertyCount: number,
) {
  const billableProperties = Math.max(0, propertyCount - 1)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripePaymentMethodId: true,
      email: true,
    },
  })

  if (!user) throw new Error('User not found')

  // If no billable properties, cancel if exists
  if (billableProperties === 0) {
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId)
      } catch (err) {
        console.error('[payment-service] Error cancelling subscription:', err)
      }
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'NONE',
        subscriptionPropertyCount: propertyCount,
        subscriptionMonthlyAmount: 0,
        currentPeriodEnd: null,
        stripeSubscriptionId: null,
      },
    })
    console.log(`[payment-service] Subscription cleared: user=${userId} (1 property, free tier)`)
    return
  }

  const priceId = env.STRIPE_SUBSCRIPTION_PRICE_ID
  if (!priceId) {
    // Fallback: mock mode if no price ID configured
    const monthlyAmount = billableProperties * PER_PROPERTY_MONTHLY_PENCE
    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + 30)
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'ACTIVE',
        subscriptionPropertyCount: propertyCount,
        subscriptionMonthlyAmount: monthlyAmount,
        currentPeriodEnd: periodEnd,
      },
    })
    console.log(`[payment-service] Mock subscription (no STRIPE_SUBSCRIPTION_PRICE_ID): user=${userId} properties=${propertyCount}`)
    return
  }

  const customerId = user.stripeCustomerId ?? await getOrCreateStripeCustomer(userId, user.email)

  if (user.stripeSubscriptionId) {
    // Update existing subscription quantity
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
      const item = sub.items.data[0]
      if (!item) throw new Error('No subscription item found')

      const updated = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        items: [{ id: item.id, quantity: billableProperties }],
      })

      const updatedItem = updated.items.data[0]
      const periodEnd = updatedItem?.current_period_end
        ? new Date(updatedItem.current_period_end * 1000)
        : null

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionPropertyCount: propertyCount,
          subscriptionMonthlyAmount: billableProperties * PER_PROPERTY_MONTHLY_PENCE,
          currentPeriodEnd: periodEnd,
        },
      })

      console.log(
        `[payment-service] Subscription updated: user=${userId} quantity=${billableProperties} sub=${updated.id}`,
      )
    } catch (err) {
      console.error('[payment-service] Error updating subscription:', err)
      throw err
    }
  } else {
    // Create new subscription
    try {
      const sub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId, quantity: billableProperties }],
        default_payment_method: user.stripePaymentMethodId ?? undefined,
      })

      const subItem = sub.items.data[0]
      const periodEnd = subItem?.current_period_end
        ? new Date(subItem.current_period_end * 1000)
        : null

      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: 'ACTIVE',
          subscriptionPropertyCount: propertyCount,
          subscriptionMonthlyAmount: billableProperties * PER_PROPERTY_MONTHLY_PENCE,
          currentPeriodEnd: periodEnd,
        },
      })

      console.log(
        `[payment-service] Subscription created: user=${userId} quantity=${billableProperties} sub=${sub.id}`,
      )
    } catch (err) {
      console.error('[payment-service] Error creating subscription:', err)
      throw err
    }
  }
}

export async function cancelSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true },
  })

  if (user?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })
      console.log(`[payment-service] Subscription set to cancel at period end: user=${userId}`)
    } catch (err) {
      console.error('[payment-service] Error cancelling subscription:', err)
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'CANCELLED',
    },
  })
}
