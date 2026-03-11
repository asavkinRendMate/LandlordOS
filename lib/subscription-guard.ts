/**
 * Subscription guard — blocks property creation when payment is overdue.
 *
 * Users with 1 property never need a subscription.
 * Users with 2+ properties need ACTIVE subscription (or at minimum not PAST_DUE).
 */

import { prisma } from '@/lib/prisma'

export async function canAddProperty(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const propertyCount = await prisma.property.count({ where: { userId } })

  // First property is always free — no guard needed
  if (propertyCount < 1) {
    return { allowed: true }
  }

  // 1+ properties already: check subscription status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  })

  if (
    user?.subscriptionStatus === 'PAST_DUE' ||
    user?.subscriptionStatus === 'CANCELLED'
  ) {
    return {
      allowed: false,
      reason: user.subscriptionStatus === 'PAST_DUE'
        ? 'Your subscription payment is past due. Please update your payment method before adding more properties.'
        : 'Your subscription has been cancelled. Please resubscribe before adding more properties.',
    }
  }

  return { allowed: true }
}
