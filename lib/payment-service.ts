/**
 * Mock Payment Service
 *
 * ALL payment logic lives here — UI never calls Stripe directly.
 * When Stripe is integrated, replace the mock implementations below.
 *
 * TODO: Stripe Integration Checklist
 * - [ ] Replace saveCard() with Stripe SetupIntent + PaymentMethod attach
 * - [ ] Replace removeCard() with Stripe PaymentMethod detach
 * - [ ] Replace charge() with Stripe PaymentIntent create + confirm
 * - [ ] Replace createOrUpdateSubscription() with Stripe Subscription create/update
 * - [ ] Replace cancelSubscription() with Stripe Subscription cancel
 * - [ ] Add Stripe webhook handler for subscription lifecycle events
 * - [ ] Add Stripe Customer creation on first payment action
 * - [ ] Replace mock chargeId with real Stripe PaymentIntent ID
 */

import { prisma } from '@/lib/prisma'

// ── Charge reasons & amounts ─────────────────────────────────────────────────

export type ChargeReason =
  | 'SCREENING_FIRST'
  | 'SCREENING_ADDITIONAL'
  | 'STANDALONE_SCREENING'
  | 'APT_CONTRACT'
  | 'INVENTORY_REPORT'
  | 'DISPUTE_PACK'

export const CHARGE_AMOUNTS: Record<ChargeReason, number> = {
  SCREENING_FIRST: 999,       // £9.99
  SCREENING_ADDITIONAL: 149,  // £1.49
  STANDALONE_SCREENING: 1199, // £11.99
  APT_CONTRACT: 1000,         // £10.00
  INVENTORY_REPORT: 500,      // £5.00
  DISPUTE_PACK: 2900,         // £29.00
}

// ── Subscription pricing ─────────────────────────────────────────────────────

const PER_PROPERTY_MONTHLY_PENCE = 1000 // £10.00/mo per additional property

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
      // In production: stripePaymentMethodId would be set here
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

// ── Charging ─────────────────────────────────────────────────────────────────

export async function charge(
  userId: string,
  reason: ChargeReason,
  amountPence: number,
): Promise<{ success: boolean; chargeId: string }> {
  const cardExists = await hasCard(userId)
  if (!cardExists) {
    throw new Error('No payment method on file')
  }

  // Mock: generate a fake charge ID
  // In production: create Stripe PaymentIntent and confirm
  const chargeId = `mock_ch_${crypto.randomUUID().slice(0, 12)}`

  console.log(
    `[payment-service] Mock charge: user=${userId} reason=${reason} amount=£${(amountPence / 100).toFixed(2)} chargeId=${chargeId}`,
  )

  return { success: true, chargeId }
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export async function createOrUpdateSubscription(
  userId: string,
  propertyCount: number,
) {
  // First property is free, £10/mo each additional
  const billableProperties = Math.max(0, propertyCount - 1)
  const monthlyAmount = billableProperties * PER_PROPERTY_MONTHLY_PENCE

  // Mock: set period end to 30 days from now
  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: billableProperties > 0 ? 'ACTIVE' : 'NONE',
      subscriptionPropertyCount: propertyCount,
      subscriptionMonthlyAmount: monthlyAmount,
      currentPeriodEnd: billableProperties > 0 ? periodEnd : null,
      // In production: stripeSubscriptionId would be set here
    },
  })

  console.log(
    `[payment-service] Mock subscription: user=${userId} properties=${propertyCount} billable=${billableProperties} amount=£${(monthlyAmount / 100).toFixed(2)}/mo`,
  )
}

export async function cancelSubscription(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'CANCELLED',
      currentPeriodEnd: null,
    },
  })

  console.log(`[payment-service] Mock subscription cancelled: user=${userId}`)
}
