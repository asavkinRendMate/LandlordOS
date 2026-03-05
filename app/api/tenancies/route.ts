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
  depositAmount: z.number().int().nonnegative().optional(), // pence
  depositScheme: z.string().optional(),
  depositRef: z.string().optional(),
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

    const {
      propertyId, tenantName, tenantEmail, tenantPhone,
      monthlyRent, paymentDay, startDate,
      depositAmount, depositScheme, depositRef,
    } = result.data

    // Confirm the property belongs to this user
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Landlord is vouching for the tenant — create as TENANT immediately, no invite flow needed
    const tenancy = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          propertyId,
          name: tenantName,
          email: tenantEmail,
          phone: tenantPhone ?? null,
          status: 'TENANT',
          confirmedAt: new Date(),
        },
      })

      await tx.property.update({
        where: { id: propertyId },
        data: { status: 'ACTIVE' },
      })

      return tx.tenancy.create({
        data: {
          id: crypto.randomUUID(),
          propertyId,
          tenantId: tenant.id,
          monthlyRent,
          paymentDay,
          startDate: new Date(startDate),
          status: 'ACTIVE',
          portalToken: crypto.randomUUID(),
          depositAmount: depositAmount ?? null,
          depositScheme: depositScheme ?? null,
          depositRef: depositRef ?? null,
        },
      })
    })

    return NextResponse.json({ data: tenancy }, { status: 201 })
  } catch (err) {
    console.error('[tenancies POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
