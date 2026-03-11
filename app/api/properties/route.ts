import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { ComplianceDocType } from '@prisma/client'
import { createOrUpdateSubscription } from '@/lib/payment-service'
import { canAddProperty } from '@/lib/subscription-guard'

const schema = z.object({
  name: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  type: z.enum(['FLAT', 'HOUSE', 'HMO', 'OTHER']),
  bedrooms: z.number().int().min(1).max(10).optional(),
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

    const { name, line1, line2, city, postcode, type, bedrooms } = result.data

    // Subscription guard: block if PAST_DUE or CANCELLED
    const guard = await canAddProperty(user.id)
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason }, { status: 402 })
    }

    // Ensure user row exists (created by DB trigger on first sign-in, but race-safe)
    await prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email! },
      update: {},
    })

    // Create property + seed 4 blank compliance docs in a transaction
    const property = await prisma.$transaction(async (tx) => {
      const prop = await tx.property.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          name: name || null,
          line1,
          line2,
          city,
          postcode: postcode.toUpperCase(),
          type,
          bedrooms: bedrooms ?? null,
          screeningCycleResetAt: new Date(),
        },
      })

      const docTypes: ComplianceDocType[] = [
        ComplianceDocType.GAS_SAFETY,
        ComplianceDocType.EPC,
        ComplianceDocType.EICR,
        ComplianceDocType.HOW_TO_RENT,
      ]

      await tx.complianceDoc.createMany({
        data: docTypes.map((t) => ({
          id: crypto.randomUUID(),
          propertyId: prop.id,
          type: t,
        })),
      })

      return prop
    })

    // Check if subscription action is needed (2+ properties)
    const propertyCount = await prisma.property.count({
      where: { userId: user.id },
    })

    if (propertyCount > 1) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { paymentMethodStatus: true },
      })

      if (dbUser?.paymentMethodStatus !== 'SAVED') {
        return NextResponse.json(
          { data: property, requiresCard: true, propertyCount },
          { status: 201 },
        )
      }

      // Has card — update subscription automatically
      await createOrUpdateSubscription(user.id, propertyCount)
    }

    return NextResponse.json({ data: property }, { status: 201 })
  } catch (err) {
    console.error('[properties POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createAuthClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const properties = await prisma.property.findMany({
      where: { userId: user.id },
      include: {
        complianceDocs: true,
        tenancies: {
          where: { status: { not: 'ENDED' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: properties })
  } catch (err) {
    console.error('[properties GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
