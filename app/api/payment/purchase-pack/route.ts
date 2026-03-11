import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'
import { STANDALONE_PACKAGES } from '@/lib/screening-pricing'

const schema = z.object({
  packageType: z.enum(['SINGLE', 'TRIPLE', 'SIXER', 'TEN']),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body: unknown = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 })
    }

    const pkg = STANDALONE_PACKAGES.find((p) => p.type === parsed.data.packageType)
    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 400 })
    }

    // Ensure user exists in our DB
    const user = await prisma.user.upsert({
      where: { id: authUser.id },
      update: {},
      create: { id: authUser.id, email: authUser.email! },
    })

    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    // Reload user to get latest payment method info
    const freshUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        stripePaymentMethodId: true,
        paymentMethodStatus: true,
      },
    })

    const hasSavedCard =
      freshUser.paymentMethodStatus === 'SAVED' && !!freshUser.stripePaymentMethodId

    if (hasSavedCard) {
      // Scenario A: charge saved card immediately
      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          amountPence: pkg.pricePence,
          reason: `CREDIT_PACK_${pkg.type}`,
          status: 'pending',
          metadata: { packId: pkg.type, credits: pkg.credits },
        },
      })

      try {
        const pi = await stripe.paymentIntents.create({
          amount: pkg.pricePence,
          currency: 'gbp',
          customer: customerId,
          payment_method: freshUser.stripePaymentMethodId!,
          confirm: true,
          off_session: false,
          metadata: {
            type: 'credit_pack',
            packId: pkg.type,
            userId: user.id,
            credits: String(pkg.credits),
            paymentId: payment.id,
          },
        })

        // Create ScreeningPackage + update Payment in transaction
        const screeningPackage = await prisma.$transaction(async (tx) => {
          const sp = await tx.screeningPackage.create({
            data: {
              userId: user.id,
              packageType: parsed.data.packageType,
              totalCredits: pkg.credits,
              usedCredits: 0,
              pricePence: pkg.pricePence,
              paymentStatus: 'PAID',
            },
          })

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              stripePaymentIntentId: pi.id,
              status: 'succeeded',
              referenceId: sp.id,
            },
          })

          return sp
        })

        console.log(
          `[purchase-pack] Charged saved card: user=${user.id} pack=${pkg.type} credits=${pkg.credits} pi=${pi.id}`,
        )

        return NextResponse.json({
          data: {
            status: 'succeeded',
            credits: screeningPackage.totalCredits,
            packageId: screeningPackage.id,
          },
        })
      } catch (err) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed' },
        })
        console.error(`[purchase-pack] Charge failed: user=${user.id}`, err)
        return NextResponse.json({ error: 'Payment failed' }, { status: 402 })
      }
    }

    // Scenario B: no saved card — create unconfirmed PaymentIntent, return clientSecret
    const pi = await stripe.paymentIntents.create({
      amount: pkg.pricePence,
      currency: 'gbp',
      customer: customerId,
      setup_future_usage: 'off_session',
      metadata: {
        type: 'credit_pack',
        packId: pkg.type,
        userId: user.id,
        credits: String(pkg.credits),
      },
    })

    console.log(
      `[purchase-pack] Created PaymentIntent for new card: user=${user.id} pack=${pkg.type} pi=${pi.id}`,
    )

    return NextResponse.json({
      data: {
        status: 'requires_payment_method',
        clientSecret: pi.client_secret,
      },
    })
  } catch (err) {
    console.error('[purchase-pack POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
