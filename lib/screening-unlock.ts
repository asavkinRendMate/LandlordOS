/**
 * Server-side screening unlock pricing logic.
 *
 * Priority:
 * 1. Credit pack (if available) → 1 credit per unlock, no card needed
 * 2. Property-based → card pricing (£9.99 first / £1.49 additional per cycle)
 *    Available to ALL authenticated landlords, not just subscribers.
 *    Cycle resets when property.status → VACANT
 * 3. Standalone (no propertyId, no credits) → error
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

  // Credit pack check first — no card needed, works for any report type
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

  // Property-based: card pricing (£9.99/£1.49) for ALL authenticated landlords
  if (report.propertyId) {
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

  // Standalone report without credits
  return {
    type: 'error',
    message: 'Credit pack required to unlock standalone reports',
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
