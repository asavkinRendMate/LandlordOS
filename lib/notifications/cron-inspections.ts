// Cron job: periodic inspection reminders.
// Runs daily at 7am UTC via /api/cron/inspections.
// Pass 1: Sends landlord a reminder 7 days before the next inspection due date.
// Pass 2: Sends day-of reminders to both landlord and tenant.

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import {
  inspectionReminderHtml,
  inspectionDayLandlordHtml,
  inspectionDayTenantHtml,
} from '@/lib/email-templates'

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

/** Pass 1 — 7-day landlord reminders (schedule-based) */
async function runPass1SevenDayReminders(): Promise<number> {
  let sent = 0

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

  return sent
}

/** Pass 2 — Day-of reminders to both landlord and tenant (inspection-based) */
async function runPass2DayOfReminders(): Promise<number> {
  let sent = 0

  // Find inspections scheduled for today that haven't had a day-of reminder sent
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setUTCHours(23, 59, 59, 999)

  const inspections = await prisma.propertyInspection.findMany({
    where: {
      inspectionType: 'PERIODIC',
      scheduledDate: { gte: todayStart, lte: todayEnd },
      dayOfReminderSentAt: null,
      status: { in: ['DRAFT', 'PENDING'] },
    },
    include: {
      property: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      tenant: { select: { name: true, email: true } },
    },
  })

  for (const inspection of inspections) {
    const landlord = inspection.property.user
    if (!landlord?.email) continue

    const propertyAddress = formatPropertyAddress(inspection.property)
    const scheduledDate = formatDateUK(inspection.scheduledDate!)
    const dashboardUrl = `${appUrl}/dashboard/properties/${inspection.propertyId}`

    // Send to landlord
    await sendEmail({
      to: landlord.email,
      subject: `Inspection today — ${propertyAddress}`,
      html: inspectionDayLandlordHtml({
        landlordName: landlord.name ?? 'Landlord',
        propertyAddress,
        scheduledDate,
        scheduledTime: inspection.scheduledTime ?? undefined,
        tenantName: inspection.tenant?.name ?? 'Tenant',
        dashboardUrl,
      }),
    })
    sent++

    // Send to tenant (if assigned and has email)
    if (inspection.tenant?.email) {
      await sendEmail({
        to: inspection.tenant.email,
        subject: `Property inspection today — ${propertyAddress}`,
        html: inspectionDayTenantHtml({
          tenantName: inspection.tenant.name,
          propertyAddress,
          scheduledDate,
          scheduledTime: inspection.scheduledTime ?? undefined,
          landlordName: landlord.name ?? 'Your landlord',
        }),
      })
      sent++
    }

    // Mark as sent — deduplication via dayOfReminderSentAt
    await prisma.propertyInspection.update({
      where: { id: inspection.id },
      data: { dayOfReminderSentAt: new Date() },
    })
  }

  return sent
}

export async function runInspectionReminders(): Promise<{ sent: number; pass1: number; pass2: number }> {
  const pass1 = await runPass1SevenDayReminders()
  const pass2 = await runPass2DayOfReminders()
  return { sent: pass1 + pass2, pass1, pass2 }
}
