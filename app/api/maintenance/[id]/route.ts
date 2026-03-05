import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'

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

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/maintenance/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
