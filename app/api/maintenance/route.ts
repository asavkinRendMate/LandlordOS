import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { sendEmail } from '@/lib/resend'
import {
  maintenanceNewRequestHtml,
  maintenanceTenantConfirmationHtml,
  awaabsLawExpiringHtml,
} from '@/lib/email-templates'
import type { MaintenancePriority } from '@prisma/client'

const priorityOrder: Record<MaintenancePriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

// GET /api/maintenance
// Landlord: ?propertyId= (optional filter), ?status= (optional)
// Tenant:   ?tenantId= (required)
export async function GET(req: NextRequest) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const tenantId  = searchParams.get('tenantId')
  const propertyId = searchParams.get('propertyId')
  const statusFilter = searchParams.get('status')

  try {
    if (tenantId) {
      // Tenant path — verify this tenant belongs to the authenticated user
      const tenant = await prisma.tenant.findFirst({
        where: { id: tenantId, userId: user.id },
      })
      if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      const requests = await prisma.maintenanceRequest.findMany({
        where: {
          tenantId,
          ...(statusFilter ? { status: statusFilter as never } : {}),
        },
        include: {
          property: { select: { name: true, line1: true } },
          tenant:   { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      const sorted = [...requests].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
          || b.createdAt.getTime() - a.createdAt.getTime(),
      )
      return NextResponse.json({ data: sorted })
    }

    // Landlord path
    const requests = await prisma.maintenanceRequest.findMany({
      where: {
        property: { userId: user.id },
        ...(propertyId ? { propertyId } : {}),
        ...(statusFilter ? { status: statusFilter as never } : {}),
      },
      include: {
        property: { select: { name: true, line1: true } },
        tenant:   { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const sorted = [...requests].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        || b.createdAt.getTime() - a.createdAt.getTime(),
    )
    return NextResponse.json({ data: sorted })
  } catch (err) {
    console.error('[GET /api/maintenance]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const postSchema = z.object({
  propertyId:  z.string().min(1),
  tenantId:    z.string().min(1),
  title:       z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category:    z.string().max(50).optional(),
})

// POST /api/maintenance
export async function POST(req: NextRequest) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { propertyId, tenantId, title, description, priority, category } = parsed.data

    // Security: verify the tenant exists with matching propertyId and belongs to the requester
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, propertyId, userId: user.id },
    })
    if (!tenant) return NextResponse.json({ error: 'Tenant not found or forbidden' }, { status: 403 })

    // Awaab's Law: DAMP_MOULD complaints get a 24h response deadline
    const isDampMould = category === 'DAMP_MOULD'
    const respondBy = isDampMould ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined

    const [request] = await prisma.$transaction(async (tx) => {
      const req = await tx.maintenanceRequest.create({
        data: {
          propertyId,
          tenantId,
          title,
          description,
          priority: priority ?? 'MEDIUM',
          category: category ?? null,
          respondBy: respondBy ?? null,
        },
      })
      await tx.maintenanceStatusHistory.create({
        data: {
          requestId: req.id,
          fromStatus: null,
          toStatus: 'OPEN',
          changedBy: tenantId,
          note: 'Request submitted',
        },
      })
      return [req]
    })

    // Non-blocking email notifications
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { user: { select: { email: true, name: true } } },
      })
      if (property) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'
        const landlordName = property.user.name?.split(' ')[0] || 'there'
        const propertyAddress = `${property.line1}, ${property.city} ${property.postcode}`
        const dashboardUrl = `${appUrl}/dashboard/maintenance/${request.id}`
        const tenantDashboardUrl = `${appUrl}/tenant/dashboard`
        const usedPriority = priority ?? 'MEDIUM'

        const emails: Promise<unknown>[] = [
          // 1. Notify landlord
          sendEmail({
            to: property.user.email,
            subject: `${usedPriority} maintenance request: ${title} \u2014 ${propertyAddress}`,
            html: maintenanceNewRequestHtml({
              landlordName,
              tenantName: tenant.name,
              propertyAddress,
              requestTitle: title,
              description,
              priority: usedPriority,
              photosCount: 0,
              dashboardUrl,
            }),
          }),
          // 2. Confirm to tenant
          sendEmail({
            to: tenant.email,
            subject: `We've received your maintenance request \u2014 ${title}`,
            html: maintenanceTenantConfirmationHtml({
              tenantName: tenant.name,
              requestTitle: title,
              propertyAddress,
              dashboardUrl: tenantDashboardUrl,
            }),
          }),
        ]

        // 3. Awaab's Law immediate alert
        if (isDampMould && respondBy) {
          const formatDateTime = (d: Date) => d.toLocaleString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
          emails.push(
            sendEmail({
              to: property.user.email,
              subject: `URGENT: response required in 24h \u2014 ${propertyAddress}`,
              html: awaabsLawExpiringHtml({
                landlordName,
                propertyAddress,
                tenantName: tenant.name,
                requestTitle: title,
                createdAt: formatDateTime(request.createdAt),
                respondByDeadline: formatDateTime(respondBy),
                hoursRemaining: 24,
                dashboardUrl,
              }),
            }),
          )
        }

        await Promise.all(emails)
      }
    } catch (emailErr) {
      console.error('[POST /api/maintenance] Email notification failed', emailErr)
    }

    return NextResponse.json({ data: request }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/maintenance]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
