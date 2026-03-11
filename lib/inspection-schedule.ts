import { prisma } from '@/lib/prisma'

/**
 * When a PERIODIC inspection reaches AGREED, advance the schedule's nextDueDate
 * by the configured frequencyMonths. No-op for MOVE_IN or MOVE_OUT inspections.
 */
export async function advanceScheduleIfPeriodic(inspectionId: string) {
  const inspection = await prisma.propertyInspection.findUnique({
    where: { id: inspectionId },
    select: { inspectionType: true, propertyId: true },
  })
  if (!inspection || inspection.inspectionType !== 'PERIODIC') return

  // Find the active tenancy's schedule for this property
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      propertyId: inspection.propertyId,
      status: { in: ['ACTIVE', 'NOTICE_GIVEN'] },
    },
    include: { inspectionSchedule: true },
  })
  if (!tenancy?.inspectionSchedule) return

  const schedule = tenancy.inspectionSchedule
  const nextDueDate = new Date(schedule.nextDueDate)
  nextDueDate.setMonth(nextDueDate.getMonth() + schedule.frequencyMonths)

  await prisma.inspectionSchedule.update({
    where: { id: schedule.id },
    data: { nextDueDate },
  })
}
