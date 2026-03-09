import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { sendEmail } from '@/lib/resend'
import {
  maintenanceStatusUpdateLandlordHtml,
  maintenanceStatusUpdateTenantHtml,
} from '@/lib/email-templates'

// GET /api/maintenance/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, name: true, line1: true, city: true, userId: true } },
        tenant:   { select: { id: true, name: true, userId: true } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
        photos:        { orderBy: { uploadedAt: 'asc' } },
      },
    })

    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner  = request.property.userId === user.id
    const isTenant = request.tenant.userId === user.id
    if (!isOwner && !isTenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({ data: request })
  } catch (err) {
    console.error('[GET /api/maintenance/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const patchSchema = z.object({
  status:   z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  note:     z.string().max(500).optional(),
})

// PATCH /api/maintenance/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { property: { select: { userId: true } } },
    })

    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (request.property.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { status, priority, note } = parsed.data

    const oldStatus = request.status
    const updated = await prisma.$transaction(async (tx) => {
      // Build update data
      const updateData: Record<string, unknown> = {}
      if (priority !== undefined) updateData.priority = priority
      if (status !== undefined) {
        updateData.status = status
        if (status === 'IN_PROGRESS') {
          updateData.inProgressAt = new Date()
        }
        if (status === 'RESOLVED') {
          updateData.resolvedAt = new Date()
          updateData.resolvedBy = user.id
        }
        if (status === 'OPEN') {
          updateData.resolvedAt = null
          updateData.resolvedBy = null
          updateData.inProgressAt = null
        }

        // Create status history entry
        await tx.maintenanceStatusHistory.create({
          data: {
            requestId: id,
            fromStatus: request.status,
            toStatus: status,
            changedBy: user.id,
            note: note ?? null,
          },
        })
      }

      return tx.maintenanceRequest.update({
        where: { id },
        data: updateData,
      })
    })

    // Non-blocking status change notifications
    if (status !== undefined && status !== oldStatus) {
      try {
        const full = await prisma.maintenanceRequest.findUnique({
          where: { id },
          include: {
            property: {
              include: { user: { select: { email: true, name: true } } },
            },
            tenant: { select: { name: true, email: true } },
          },
        })
        if (full) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'
          const propertyAddress = `${full.property.line1}, ${full.property.city} ${full.property.postcode}`
          const landlordName = full.property.user.name?.split(' ')[0] || 'there'
          const formatStatus = (s: string) =>
            s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

          await Promise.all([
            sendEmail({
              to: full.property.user.email,
              subject: `Maintenance update: ${full.title} \u2014 ${propertyAddress}`,
              html: maintenanceStatusUpdateLandlordHtml({
                landlordName,
                requestTitle: full.title,
                propertyAddress,
                tenantName: full.tenant.name,
                oldStatus: formatStatus(oldStatus),
                newStatus: formatStatus(status),
                dashboardUrl: `${appUrl}/dashboard/maintenance/${id}`,
              }),
            }),
            sendEmail({
              to: full.tenant.email,
              subject: `Update on your maintenance request \u2014 ${full.title}`,
              html: maintenanceStatusUpdateTenantHtml({
                tenantName: full.tenant.name,
                requestTitle: full.title,
                propertyAddress,
                oldStatus: formatStatus(oldStatus),
                newStatus: formatStatus(status),
                landlordNote: note ?? undefined,
                dashboardUrl: `${appUrl}/tenant/dashboard`,
              }),
            }),
          ])
        }
      } catch (emailErr) {
        console.error('[PATCH /api/maintenance/[id]] Email notification failed', emailErr)
      }
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/maintenance/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
