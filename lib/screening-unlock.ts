/**
 * Server-side screening unlock pricing logic.
 *
 * Two flows:
 * 1. Property-based (report.propertyId set) → subscriber pricing
 *    - £9.99 first unlock per property cycle, £1.49 each additional
 *    - Cycle resets when property.status → VACANT
 * 2. Standalone (no propertyId) → credit pack (1 credit per unlock)
 *
 * Subscriber with pack credits → subscriber pricing wins, pack untouched.
 */

import { prisma } from '@/lib/prisma'
import { CHARGE_AMOUNTS } from '@/lib/payment-service'

export type UnlockMethod =
  | { type: 'subscriber'; reason: 'SCREENING_FIRST' | 'SCREENING_ADDITIONAL'; amountPence: number }
  | { type: 'credit_pack'; packageId: string }
  | { type: 'error'; message: string }

interface ReportForUnlock {
  id: string
  propertyId: string | null
  isLocked: boolean
  status: string
}

export async function determineUnlockMethod(
  userId: string,
  report: ReportForUnlock,
): Promise<UnlockMethod> {
  if (!report.isLocked) {
    return { type: 'error', message: 'Report is already unlocked' }
  }
  if (report.status !== 'COMPLETED') {
    return { type: 'error', message: 'Report is not yet completed' }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  })

  // Property-based flow: subscriber pricing
  if (report.propertyId) {
    if (user?.subscriptionStatus === 'ACTIVE') {
      const property = await prisma.property.findUnique({
        where: { id: report.propertyId },
        select: { screeningCycleResetAt: true, createdAt: true },
      })

      const cycleStart = property?.screeningCycleResetAt ?? property?.createdAt ?? new Date(0)

      // Count payments whose referenceId points to a report for this property
      const paymentsForProperty = await prisma.payment.findMany({
        where: {
          userId,
          reason: { in: ['SCREENING_FIRST', 'SCREENING_ADDITIONAL'] },
          status: 'succeeded',
          createdAt: { gte: cycleStart },
          referenceId: { not: null },
        },
        select: { referenceId: true },
      })

      let cycleUnlocks = 0
      if (paymentsForProperty.length > 0) {
        const reportIds = paymentsForProperty
          .map((p) => p.referenceId)
          .filter((id): id is string => id !== null)

        if (reportIds.length > 0) {
          cycleUnlocks = await prisma.financialReport.count({
            where: {
              id: { in: reportIds },
              propertyId: report.propertyId,
            },
          })
        }
      }

      if (cycleUnlocks === 0) {
        return {
          type: 'subscriber',
          reason: 'SCREENING_FIRST',
          amountPence: CHARGE_AMOUNTS.SCREENING_FIRST,
        }
      }
      return {
        type: 'subscriber',
        reason: 'SCREENING_ADDITIONAL',
        amountPence: CHARGE_AMOUNTS.SCREENING_ADDITIONAL,
      }
    }

    // Not subscriber — fall through to credit pack
  }

  // Credit pack flow (standalone or non-subscriber property-based)
  // Prisma doesn't support field-to-field comparison in where clause,
  // so we fetch and compare in JS.
  const packWithCredits = await prisma.screeningPackage.findFirst({
    where: {
      userId,
      paymentStatus: { in: ['PAID', 'MOCK_PAID'] },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (packWithCredits && packWithCredits.usedCredits < packWithCredits.totalCredits) {
    return { type: 'credit_pack', packageId: packWithCredits.id }
  }

  return {
    type: 'error',
    message: report.propertyId
      ? 'Active subscription or credit pack required to unlock reports'
      : 'Credit pack required to unlock standalone reports',
  }
}

/**
 * Get unlock price for display (before user confirms).
 */
export async function getUnlockPrice(
  userId: string,
  report: ReportForUnlock,
): Promise<{ method: string; amountPence: number; label: string } | { error: string }> {
  const result = await determineUnlockMethod(userId, report)

  if (result.type === 'error') {
    return { error: result.message }
  }

  if (result.type === 'credit_pack') {
    return { method: 'credit_pack', amountPence: 0, label: '1 credit' }
  }

  return {
    method: 'subscriber',
    amountPence: result.amountPence,
    label: `£${(result.amountPence / 100).toFixed(2)}`,
  }
}
