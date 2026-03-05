import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
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

    const { propertyId, tenantId, title, description, priority } = parsed.data

    // Security: verify the tenant exists with matching propertyId and belongs to the requester
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, propertyId, userId: user.id },
    })
    if (!tenant) return NextResponse.json({ error: 'Tenant not found or forbidden' }, { status: 403 })

    const [request] = await prisma.$transaction(async (tx) => {
      const req = await tx.maintenanceRequest.create({
        data: { propertyId, tenantId, title, description, priority: priority ?? 'MEDIUM' },
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

    return NextResponse.json({ data: request }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/maintenance]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
