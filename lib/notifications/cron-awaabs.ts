// Cron job: Awaab's Law 4-hour reminder for damp/mould maintenance requests.
// Runs every 15 minutes via /api/cron/awaabs (vercel.json schedule: */15 * * * *).
// Updated: 2026-03-09 — maintenance + Awaab's Law notifications

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { awaabsLawExpiringHtml } from '@/lib/email-templates'

function formatDateTimeUK(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPropertyAddress(property: { line1: string; city: string; postcode: string }): string {
  return `${property.line1}, ${property.city} ${property.postcode}`
}

export async function runAwaabsLawAlerts(): Promise<number> {
  console.log('[Cron] Running Awaab\'s Law alerts...')
  let sentCount = 0

  const now = new Date()
  const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000)
  const windowEnd = new Date(fourHoursFromNow.getTime() + 15 * 60 * 1000)

  // Find maintenance requests with respondBy between now+4h and now+4h+15min
  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      respondBy: {
        not: null,
        gte: fourHoursFromNow,
        lt: windowEnd,
      },
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    },
    include: {
      property: {
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      },
      tenant: { select: { name: true } },
    },
  })

  for (const req of requests) {
    if (!req.respondBy || !req.tenant) continue

    // Deduplication — check if AWAABS_LAW_TIMER_EXPIRING already sent for this request in last 2h
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const alreadySent = await prisma.complianceAlertLog.findFirst({
      where: {
        notificationId: 'AWAABS_LAW_TIMER_EXPIRING',
        referenceId: req.id,
        sentAt: { gte: twoHoursAgo },
      },
    })
    if (alreadySent) continue

    const landlord = req.property.user
    const landlordName = landlord.name?.split(' ')[0] || 'there'
    const propertyAddress = formatPropertyAddress(req.property)
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'}/dashboard/maintenance/${req.id}`

    const result = await sendEmail({
      to: landlord.email,
      subject: `URGENT: response required in 4h \u2014 ${propertyAddress}`,
      html: awaabsLawExpiringHtml({
        landlordName,
        propertyAddress,
        tenantName: req.tenant.name,
        requestTitle: req.title,
        createdAt: formatDateTimeUK(req.createdAt),
        respondByDeadline: formatDateTimeUK(req.respondBy),
        hoursRemaining: 4,
        dashboardUrl,
      }),
    })

    if (result.success) {
      await prisma.complianceAlertLog.create({
        data: {
          userId: landlord.id,
          notificationId: 'AWAABS_LAW_TIMER_EXPIRING',
          referenceId: req.id,
        },
      })
      sentCount++
    } else {
      console.error(`[Cron] Failed to send AWAABS_LAW_TIMER_EXPIRING for request ${req.id}`, result.error)
    }
  }

  console.log(`[Cron] Awaab's Law alerts complete: ${sentCount} sent`)
  return sentCount
}
