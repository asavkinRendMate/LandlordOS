import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

const postSchema = z.object({
  propertyId: z.string().min(1),
  tenantId: z.string().optional(),
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

    const report = await prisma.checkInReport.create({
      data: {
        propertyId: result.data.propertyId,
        tenantId: result.data.tenantId ?? null,
      },
    })

    return NextResponse.json({ data: report }, { status: 201 })
  } catch (err) {
    console.error('[check-in POST]', err)
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

    const report = await prisma.checkInReport.findFirst({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, pdfUrl: true },
    })

    return NextResponse.json({ data: report ?? null })
  } catch (err) {
    console.error('[check-in GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
