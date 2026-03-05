import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({
  receivedDate: z.string().datetime(),
  receivedAmount: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { receivedDate, receivedAmount, note } = parsed.data
    const { id } = await params

    const payment = await prisma.rentPayment.findUnique({
      where: { id },
      include: {
        tenancy: { include: { property: { select: { userId: true } } } },
      },
    })

    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (payment.tenancy.property.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isPartial = receivedAmount !== undefined && receivedAmount < payment.amount
    const updated = await prisma.rentPayment.update({
      where: { id },
      data: {
        receivedDate: new Date(receivedDate),
        receivedAmount: receivedAmount ?? payment.amount,
        note: note ?? null,
        status: isPartial ? 'PARTIAL' : 'RECEIVED',
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[payments/[id] PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
