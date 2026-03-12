import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({
  monthlyRent: z.number().int().positive().optional(),       // pence
  paymentDay: z.number().int().min(1).max(28).optional(),
  startDate: z.string().datetime().optional(),
  depositAmount: z.number().int().nonnegative().optional(),   // pence
  depositScheme: z.string().optional(),
  depositRef: z.string().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = patchSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    // Confirm property belongs to user
    const property = await prisma.property.findFirst({
      where: { id: params.id, userId: user.id },
    })
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Find the active tenancy for this property
    const tenancy = await prisma.tenancy.findFirst({
      where: { propertyId: params.id, status: { not: 'ENDED' } },
      orderBy: { createdAt: 'desc' },
    })
    if (!tenancy) return NextResponse.json({ error: 'No active tenancy found' }, { status: 404 })

    const { monthlyRent, paymentDay, startDate, depositAmount, depositScheme, depositRef } = result.data

    const updated = await prisma.tenancy.update({
      where: { id: tenancy.id },
      data: {
        ...(monthlyRent !== undefined && { monthlyRent }),
        ...(paymentDay !== undefined && { paymentDay }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(depositAmount !== undefined && { depositAmount }),
        ...(depositScheme !== undefined && { depositScheme: depositScheme || null }),
        ...(depositRef !== undefined && { depositRef: depositRef || null }),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[properties/[id]/tenancy PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
