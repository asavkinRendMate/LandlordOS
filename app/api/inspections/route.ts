import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { InspectionType } from '@prisma/client'

const timeRegex = /^(?:0[89]|1[0-9]|20):(?:00|15|30|45)$/

const postSchema = z.object({
  propertyId: z.string().min(1),
  tenantId: z.string().optional(),
  inspectionType: z.enum(['MOVE_IN', 'PERIODIC', 'MOVE_OUT']).optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().regex(timeRegex, 'Time must be between 08:00 and 20:00 in 15-min increments').optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = postSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const property = await prisma.property.findFirst({
      where: { id: result.data.propertyId, userId: user.id },
    })
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const type = (result.data.inspectionType ?? 'MOVE_IN') as InspectionType

    // Compute inspection number for PERIODIC inspections
    let inspectionNumber = 1
    if (type === 'PERIODIC') {
      const count = await prisma.propertyInspection.count({
        where: { propertyId: result.data.propertyId, inspectionType: 'PERIODIC' },
      })
      inspectionNumber = count + 1
    }

    const inspection = await prisma.propertyInspection.create({
      data: {
        propertyId: result.data.propertyId,
        tenantId: result.data.tenantId ?? null,
        inspectionType: type,
        inspectionNumber,
        scheduledDate: result.data.scheduledDate ? new Date(result.data.scheduledDate) : null,
        scheduledTime: result.data.scheduledTime ?? null,
      },
    })

    return NextResponse.json({ data: inspection }, { status: 201 })
  } catch (err) {
    console.error('[inspections POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const propertyId = req.nextUrl.searchParams.get('propertyId')
    if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 })

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const typeFilter = req.nextUrl.searchParams.get('type') as InspectionType | null

    // If type filter is provided, return an array of all matching inspections
    if (typeFilter) {
      const inspections = await prisma.propertyInspection.findMany({
        where: { propertyId, inspectionType: typeFilter },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          inspectionType: true,
          inspectionNumber: true,
          scheduledDate: true,
          scheduledTime: true,
          pdfUrl: true,
          createdAt: true,
        },
      })
      return NextResponse.json({ data: inspections })
    }

    // Default: return latest single inspection (existing behavior for move-in)
    const inspection = await prisma.propertyInspection.findFirst({
      where: { propertyId, inspectionType: 'MOVE_IN' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, pdfUrl: true },
    })

    return NextResponse.json({ data: inspection ?? null })
  } catch (err) {
    console.error('[inspections GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
