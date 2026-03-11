// Cron job: periodic inspection reminders.
// Runs daily via /api/cron/inspections.
// Sends landlord a reminder 7 days before the next inspection due date.

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { inspectionReminderHtml } from '@/lib/email-templates'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

function formatDateUK(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatPropertyAddress(property: { line1: string; city: string; postcode: string }): string {
  return `${property.line1}, ${property.city} ${property.postcode}`
}

async function wasAlertSentRecently(
  notificationId: string,
  referenceId: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - 86_400_000) // 24 hours ago
  const existing = await prisma.complianceAlertLog.findFirst({
    where: {
      notificationId,
      referenceId,
      sentAt: { gte: cutoff },
    },
  })
  return !!existing
}

async function logAlert(userId: string, notificationId: string, referenceId: string) {
  await prisma.complianceAlertLog.create({
    data: { userId, notificationId, referenceId },
  })
}

export async function runInspectionReminders(): Promise<{ sent: number }> {
  let sent = 0

  // Find schedules where nextDueDate is within 7 days from now
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000)

  const schedules = await prisma.inspectionSchedule.findMany({
    where: {
      nextDueDate: { lte: sevenDaysFromNow },
      tenancy: { status: { in: ['ACTIVE', 'NOTICE_GIVEN'] } },
    },
    include: {
      tenancy: {
        include: {
          property: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          tenant: { select: { name: true } },
        },
      },
    },
  })

  for (const schedule of schedules) {
    const { tenancy } = schedule
    const landlord = tenancy.property.user
    if (!landlord?.email) continue
    if (!tenancy.tenant) continue

    const alertId = 'INSPECTION_REMINDER_LANDLORD'
    const refId = schedule.id

    if (await wasAlertSentRecently(alertId, refId)) continue

    const propertyAddress = formatPropertyAddress(tenancy.property)

    await sendEmail({
      to: landlord.email,
      subject: `Inspection due soon — ${propertyAddress}`,
      html: inspectionReminderHtml({
        landlordName: landlord.name ?? 'Landlord',
        propertyAddress,
        scheduledDate: formatDateUK(schedule.nextDueDate),
        tenantName: tenancy.tenant.name,
        dashboardUrl: `${appUrl}/dashboard/properties/${tenancy.propertyId}`,
      }),
    })

    await logAlert(landlord.id, alertId, refId)
    sent++
  }

  return { sent }
}
