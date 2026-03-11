import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  tenancyId: z.string().min(1),
  frequencyMonths: z.number().int().refine((v) => v === 3 || v === 6, {
    error: 'Frequency must be 3 or 6 months',
  }),
})

const patchSchema = z.object({
  tenancyId: z.string().min(1),
  frequencyMonths: z.number().int().refine((v) => v === 3 || v === 6, {
    error: 'Frequency must be 3 or 6 months',
  }),
})

/** GET — fetch schedule for a tenancy */
export async function GET(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tenancyId = searchParams.get('tenancyId')
    if (!tenancyId) return NextResponse.json({ error: 'tenancyId required' }, { status: 400 })

    // Verify ownership
    const tenancy = await prisma.tenancy.findFirst({
      where: { id: tenancyId, property: { userId: user.id } },
    })
    if (!tenancy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const schedule = await prisma.inspectionSchedule.findUnique({
      where: { tenancyId },
    })

    return NextResponse.json({ data: schedule })
  } catch (err) {
    console.error('[inspection-schedules GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

/** POST — create schedule for a tenancy */
export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = createSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { tenancyId, frequencyMonths } = result.data

    // Verify ownership
    const tenancy = await prisma.tenancy.findFirst({
      where: { id: tenancyId, property: { userId: user.id } },
    })
    if (!tenancy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Compute next due date from now
    const nextDueDate = new Date()
    nextDueDate.setMonth(nextDueDate.getMonth() + frequencyMonths)

    const schedule = await prisma.inspectionSchedule.create({
      data: { tenancyId, frequencyMonths, nextDueDate },
    })

    return NextResponse.json({ data: schedule })
  } catch (err) {
    console.error('[inspection-schedules POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

/** PATCH — update frequency (recalculates next due date) */
export async function PATCH(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = patchSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { tenancyId, frequencyMonths } = result.data

    // Verify ownership
    const tenancy = await prisma.tenancy.findFirst({
      where: { id: tenancyId, property: { userId: user.id } },
    })
    if (!tenancy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const existing = await prisma.inspectionSchedule.findUnique({ where: { tenancyId } })
    if (!existing) return NextResponse.json({ error: 'No schedule exists' }, { status: 404 })

    // Recalculate next due date from now
    const nextDueDate = new Date()
    nextDueDate.setMonth(nextDueDate.getMonth() + frequencyMonths)

    const schedule = await prisma.inspectionSchedule.update({
      where: { tenancyId },
      data: { frequencyMonths, nextDueDate },
    })

    return NextResponse.json({ data: schedule })
  } catch (err) {
    console.error('[inspection-schedules PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

/** DELETE — remove schedule */
export async function DELETE(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tenancyId = searchParams.get('tenancyId')
    if (!tenancyId) return NextResponse.json({ error: 'tenancyId required' }, { status: 400 })

    const tenancy = await prisma.tenancy.findFirst({
      where: { id: tenancyId, property: { userId: user.id } },
    })
    if (!tenancy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.inspectionSchedule.delete({ where: { tenancyId } }).catch(() => {})

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('[inspection-schedules DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
