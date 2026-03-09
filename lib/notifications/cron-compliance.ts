// Cron job: compliance document expiry + deposit protection warnings.
// Runs daily via /api/cron/compliance (vercel.json schedule: 0 9 * * *).
// Updated: 2026-03-09 — compliance alert cron job

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import {
  complianceExpiry30dHtml,
  complianceExpiry7dHtml,
  complianceExpiredHtml,
  depositUnprotectedWarningHtml,
} from '@/lib/email-templates'

const COMPLIANCE_DOC_LABELS: Record<string, string> = {
  GAS_SAFETY: 'Gas Safety Certificate',
  EPC: 'Energy Performance Certificate (EPC)',
  EICR: 'Electrical Installation Condition Report (EICR)',
  HOW_TO_RENT: 'How to Rent Guide',
}

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

async function logAlert(
  userId: string,
  notificationId: string,
  referenceId: string,
): Promise<void> {
  await prisma.complianceAlertLog.create({
    data: { userId, notificationId, referenceId },
  })
}

async function runDocumentExpiryAlerts(): Promise<number> {
  let sentCount = 0
  const today = new Date()

  // Find all compliance docs with expiry dates on properties that have an active tenancy
  const docs = await prisma.complianceDoc.findMany({
    where: {
      expiryDate: { not: null },
      property: {
        tenancies: {
          some: { status: 'ACTIVE' },
        },
      },
    },
    include: {
      property: {
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  })

  for (const doc of docs) {
    if (!doc.expiryDate) continue

    const daysUntilExpiry = diffDays(doc.expiryDate, today)
    const landlord = doc.property.user
    const landlordName = landlord.name?.split(' ')[0] || 'there'
    const propertyAddress = formatPropertyAddress(doc.property)
    const docLabel = COMPLIANCE_DOC_LABELS[doc.type] || doc.type
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'}/dashboard/properties/${doc.property.id}`

    let notificationId: string | null = null
    let subject: string
    let html: string

    if (daysUntilExpiry === 30) {
      notificationId = 'COMPLIANCE_EXPIRY_30D'
      subject = `Action required: ${docLabel} expires in 30 days \u2014 ${propertyAddress}`
      html = complianceExpiry30dHtml({
        landlordName,
        documentType: docLabel,
        propertyAddress,
        expiryDate: formatDateUK(doc.expiryDate),
        dashboardUrl,
      })
    } else if (daysUntilExpiry === 7) {
      notificationId = 'COMPLIANCE_EXPIRY_7D'
      subject = `Urgent: ${docLabel} expires in 7 days \u2014 ${propertyAddress}`
      html = complianceExpiry7dHtml({
        landlordName,
        documentType: docLabel,
        propertyAddress,
        expiryDate: formatDateUK(doc.expiryDate),
        dashboardUrl,
      })
    } else if (daysUntilExpiry < 0) {
      notificationId = 'COMPLIANCE_EXPIRED'
      subject = `Overdue: ${docLabel} has expired \u2014 ${propertyAddress}`
      html = complianceExpiredHtml({
        landlordName,
        documentType: docLabel,
        propertyAddress,
        expiredDate: formatDateUK(doc.expiryDate),
        dashboardUrl,
      })
    } else {
      continue
    }

    // Deduplication — skip if same alert sent in last 24h
    const alreadySent = await wasAlertSentRecently(notificationId, doc.id)
    if (alreadySent) continue

    const result = await sendEmail({ to: landlord.email, subject, html })
    if (result.success) {
      await logAlert(landlord.id, notificationId, doc.id)
      sentCount++
    } else {
      console.error(`[Cron] Failed to send ${notificationId} for doc ${doc.id}`, result.error)
    }
  }

  return sentCount
}

async function runDepositAlerts(): Promise<number> {
  let sentCount = 0
  const today = new Date()

  // Find active tenancies with unprotected deposits that started within the last 30 days
  const tenancies = await prisma.tenancy.findMany({
    where: {
      status: 'ACTIVE',
      depositProtected: false,
      depositAmount: { gt: 0 },
      startDate: { not: null },
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

  for (const tenancy of tenancies) {
    if (!tenancy.startDate || !tenancy.tenant) continue

    const daysSinceStart = diffDays(today, tenancy.startDate)
    // Only alert for tenancies within the 30-day protection window
    if (daysSinceStart < 0 || daysSinceStart > 30) continue

    const daysUntilDeadline = 30 - daysSinceStart

    // Send at exactly 7 days and 3 days before deadline
    if (daysUntilDeadline !== 7 && daysUntilDeadline !== 3) continue

    const notificationId = 'DEPOSIT_UNPROTECTED_WARNING'
    const alreadySent = await wasAlertSentRecently(notificationId, tenancy.id)
    if (alreadySent) continue

    const landlord = tenancy.property.user
    const landlordName = landlord.name?.split(' ')[0] || 'there'
    const propertyAddress = formatPropertyAddress(tenancy.property)
    const deadlineDate = new Date(tenancy.startDate.getTime() + 30 * 86_400_000)
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'}/dashboard/properties/${tenancy.property.id}`

    const subject = `Action required: deposit must be protected by ${formatDateUK(deadlineDate)} \u2014 ${propertyAddress}`
    const html = depositUnprotectedWarningHtml({
      landlordName,
      propertyAddress,
      tenantName: tenancy.tenant.name,
      tenancyStartDate: formatDateUK(tenancy.startDate),
      deadlineDate: formatDateUK(deadlineDate),
      dashboardUrl,
    })

    const result = await sendEmail({ to: landlord.email, subject, html })
    if (result.success) {
      await logAlert(landlord.id, notificationId, tenancy.id)
      sentCount++
    } else {
      console.error(`[Cron] Failed to send DEPOSIT_UNPROTECTED_WARNING for tenancy ${tenancy.id}`, result.error)
    }
  }

  return sentCount
}

export async function runComplianceAlerts(): Promise<{ documentAlerts: number; depositAlerts: number }> {
  console.log('[Cron] Running compliance alerts...')

  const documentAlerts = await runDocumentExpiryAlerts()
  const depositAlerts = await runDepositAlerts()

  console.log(`[Cron] Compliance alerts complete: ${documentAlerts} document, ${depositAlerts} deposit`)
  return { documentAlerts, depositAlerts }
}
