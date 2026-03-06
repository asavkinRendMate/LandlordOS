import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        paymentMethodStatus: true,
        cardLast4: true,
        cardBrand: true,
        cardExpiry: true,
        subscriptionStatus: true,
        subscriptionPropertyCount: true,
        subscriptionMonthlyAmount: true,
        currentPeriodEnd: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        card: dbUser.paymentMethodStatus === 'SAVED'
          ? { last4: dbUser.cardLast4, brand: dbUser.cardBrand, expiry: dbUser.cardExpiry }
          : null,
        subscription: {
          status: dbUser.subscriptionStatus,
          propertyCount: dbUser.subscriptionPropertyCount,
          monthlyAmount: dbUser.subscriptionMonthlyAmount,
          currentPeriodEnd: dbUser.currentPeriodEnd,
        },
      },
    })
  } catch (err) {
    console.error('[payment/subscription GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
