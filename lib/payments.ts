import { prisma } from './prisma'

/**
 * Generates RentPayment records for the next 3 months based on the tenancy's
 * paymentDay and monthlyRent. Skips months that already have a record.
 * Safe to call on every dashboard load.
 */
export async function generateUpcomingPayments(tenancyId: string): Promise<void> {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    select: { monthlyRent: true, paymentDay: true, status: true },
  })

  if (!tenancy?.monthlyRent || !tenancy.paymentDay) return
  if (tenancy.status === 'ENDED') return

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 3; i++) {
    const dueDate = new Date(today.getFullYear(), today.getMonth() + i, tenancy.paymentDay)

    // Check if a payment already exists in this calendar month
    const monthStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1)
    const monthEnd = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0, 23, 59, 59, 999)

    const existing = await prisma.rentPayment.findFirst({
      where: { tenancyId, dueDate: { gte: monthStart, lte: monthEnd } },
      select: { id: true },
    })

    if (!existing) {
      await prisma.rentPayment.create({
        data: { tenancyId, amount: tenancy.monthlyRent, dueDate, status: 'PENDING' },
      })
    }
  }
}

/**
 * Transitions payment statuses based on today's date:
 *   PENDING  → EXPECTED  when dueDate is today
 *   PENDING/EXPECTED → LATE  when dueDate is before today (and not received)
 */
export async function updatePaymentStatuses(): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const now = new Date()

  // Due today: PENDING → EXPECTED
  await prisma.rentPayment.updateMany({
    where: { status: 'PENDING', dueDate: { gte: today, lt: tomorrow } },
    data: { status: 'EXPECTED', updatedAt: now },
  })

  // Overdue: PENDING/EXPECTED → LATE
  await prisma.rentPayment.updateMany({
    where: { status: { in: ['PENDING', 'EXPECTED'] }, dueDate: { lt: today } },
    data: { status: 'LATE', updatedAt: now },
  })
}
