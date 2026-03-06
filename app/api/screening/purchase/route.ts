import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { STANDALONE_PACKAGES } from '@/lib/screening-pricing'

const schema = z.object({
  packageType: z.enum(['SINGLE', 'TRIPLE', 'SIXER', 'TEN']),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 })
    }

    const pkg = STANDALONE_PACKAGES.find((p) => p.type === parsed.data.packageType)
    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 400 })
    }

    // Ensure user exists in our DB (may be first interaction for non-subscriber)
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: { id: user.id, email: user.email! },
    })

    // During beta: mock payment — create package as MOCK_PAID immediately
    const screeningPackage = await prisma.screeningPackage.create({
      data: {
        userId: user.id,
        packageType: parsed.data.packageType,
        totalCredits: pkg.credits,
        usedCredits: 0,
        pricePence: pkg.pricePence,
        paymentStatus: 'MOCK_PAID',
      },
    })

    return NextResponse.json({
      data: {
        packageId: screeningPackage.id,
        credits: screeningPackage.totalCredits,
        paymentStatus: screeningPackage.paymentStatus,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[screening/purchase POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
