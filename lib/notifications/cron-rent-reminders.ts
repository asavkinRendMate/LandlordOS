// Cron job: rent reminder emails to tenants (5 days before, due today, overdue).
// Runs daily via /api/cron/rent-reminders (vercel.json schedule: 0 8 * * *).
// Updated: 2026-03-09 — rent reminder cron notifications

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import {
  rentDueReminder5dHtml,
  rentDueTodayHtml,
  rentOverdueHtml,
} from '@/lib/email-templates'

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

function formatPence(pence: number): string {
  return `\u00a3${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function diffDays(a: Date, b: Date): number {
  const msPerDay = 86_400_000
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((aDay.getTime() - bDay.getTime()) / msPerDay)
}

async function wasAlertSentRecently(
  notificationId: string,
  referenceId: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - 23 * 3_600_000) // 23 hours ago
  const existing = await prisma.complianceAlertLog.findFirst({
    where: {
      notificationId,
      referenceId,
      sentAt: { gte: cutoff },
    },
  })
  return !!existing
}

async function logAlert(
  userId: string,
  notificationId: string,
  referenceId: string,
): Promise<void> {
  await prisma.complianceAlertLog.create({
    data: { userId, notificationId, referenceId },
  })
}

export async function runRentReminders(): Promise<{ sent: number }> {
  console.log('[Cron] Running rent reminders...')
  let sent = 0
  const today = new Date()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'

  // Fetch all unpaid rent payments for active tenancies with a linked tenant
  const payments = await prisma.rentPayment.findMany({
    where: {
      status: { in: ['PENDING', 'EXPECTED', 'LATE'] },
      tenancy: {
        status: 'ACTIVE',
        tenant: { isNot: null },
      },
    },
    include: {
      tenancy: {
        include: {
          tenant: { select: { name: true, email: true } },
          property: {
            include: {
              user: { select: { id: true } },
            },
          },
        },
      },
    },
  })

  for (const payment of payments) {
    const tenant = payment.tenancy.tenant
    if (!tenant?.email) continue

    const property = payment.tenancy.property
    const propertyAddress = formatPropertyAddress(property)
    const amount = formatPence(payment.amount)
    const dueDate = formatDateUK(payment.dueDate)
    const dashboardUrl = `${appUrl}/tenant/dashboard`
    const tenantName = tenant.name.split(' ')[0] || 'there'

    const daysUntil = diffDays(payment.dueDate, today)

    let notificationId: string | null = null
    let subject: string | null = null
    let html: string | null = null

    if (daysUntil === 5) {
      // 5 days before due
      notificationId = 'RENT_DUE_REMINDER_5D'
      subject = `Reminder: rent of ${amount} due in 5 days \u2014 ${propertyAddress}`
      html = rentDueReminder5dHtml({ tenantName, propertyAddress, amount, dueDate, dashboardUrl })
    } else if (daysUntil === 0) {
      // Due today
      notificationId = 'RENT_DUE_REMINDER_TODAY'
      subject = `Your rent of ${amount} is due today \u2014 ${propertyAddress}`
      html = rentDueTodayHtml({ tenantName, propertyAddress, amount, dueDate, dashboardUrl })
    } else if (daysUntil < 0 && payment.status === 'LATE') {
      // Overdue — stop after 7 days past due
      const daysPastDue = Math.abs(daysUntil)
      if (daysPastDue > 7) continue

      notificationId = 'RENT_OVERDUE'
      subject = `Overdue: rent payment of ${amount} \u2014 ${propertyAddress}`
      html = rentOverdueHtml({ tenantName, propertyAddress, amount, dueDate, daysPastDue, dashboardUrl })
    }

    if (!notificationId || !subject || !html) continue

    // Dedup — skip if same alert sent for this payment in last 23h
    const alreadySent = await wasAlertSentRecently(notificationId, payment.id)
    if (alreadySent) continue

    const result = await sendEmail({ to: tenant.email, subject, html })
    if (result.success) {
      await logAlert(property.user.id, notificationId, payment.id)
      sent++
    } else {
      console.error(`[Cron] Failed to send ${notificationId} for payment ${payment.id}`, result.error)
    }
  }

  console.log(`[Cron] Rent reminders complete: ${sent} sent`)
  return { sent }
}
