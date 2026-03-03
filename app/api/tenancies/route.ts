import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  propertyId: z.string().min(1),
  tenantName: z.string().min(1),
  tenantEmail: z.string().email(),
  tenantPhone: z.string().optional(),
  monthlyRent: z.number().int().positive(), // pence
  paymentDay: z.number().int().min(1).max(31),
  startDate: z.string().datetime(),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { propertyId, tenantName, tenantEmail, tenantPhone, monthlyRent, paymentDay, startDate } =
      result.data

    // Confirm the property belongs to this user
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const tenancy = await prisma.tenancy.create({
      data: {
        id: crypto.randomUUID(),
        propertyId,
        tenantName,
        tenantEmail,
        tenantPhone,
        monthlyRent,
        paymentDay,
        startDate: new Date(startDate),
        portalToken: crypto.randomUUID(),
      },
    })

    return NextResponse.json({ data: tenancy }, { status: 201 })
  } catch (err) {
    console.error('[tenancies POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
