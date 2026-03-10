import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripePaymentMethodId: true },
    })

    // Detach from Stripe if we have a real payment method ID
    if (dbUser?.stripePaymentMethodId) {
      try {
        await stripe.paymentMethods.detach(dbUser.stripePaymentMethodId)
      } catch (err) {
        // Log but don't fail — card may already be detached on Stripe's side
        console.warn('[payment/remove-card] Stripe detach failed:', err)
      }
    }

    // Clear DB fields regardless
    await prisma.user.update({
      where: { id: user.id },
      data: {
        paymentMethodStatus: 'NONE',
        stripePaymentMethodId: null,
        cardLast4: null,
        cardBrand: null,
        cardExpiry: null,
      },
    })

    return NextResponse.json({ data: { message: 'Card removed' } })
  } catch (err) {
    console.error('[payment/remove-card POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
