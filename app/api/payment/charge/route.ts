import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { charge } from '@/lib/payment-service'
import { determineUnlockMethod } from '@/lib/screening-unlock'

const schema = z.object({
  reportId: z.string().uuid(),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { reportId } = result.data

    // Find report owned by this user (via property or invite)
    const report = await prisma.financialReport.findFirst({
      where: {
        id: reportId,
        status: 'COMPLETED',
        isLocked: true,
        OR: [
          { property: { userId: user.id } },
          { invite: { landlordId: user.id } },
        ],
      },
      select: {
        id: true,
        propertyId: true,
        isLocked: true,
        status: true,
        inviteId: true,
      },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found or already unlocked' }, { status: 404 })
    }

    // Determine unlock method (server-side pricing)
    const method = await determineUnlockMethod(user.id, report)

    if (method.type === 'error') {
      return NextResponse.json({ error: method.message }, { status: 402 })
    }

    if (method.type === 'credit_pack') {
      // Deduct credit + unlock in transaction
      await prisma.$transaction([
        prisma.screeningPackage.update({
          where: { id: method.packageId },
          data: { usedCredits: { increment: 1 } },
        }),
        prisma.financialReport.update({
          where: { id: report.id },
          data: { isLocked: false },
        }),
        ...(report.inviteId ? [
          prisma.screeningInvite.update({
            where: { id: report.inviteId },
            data: { status: 'PAID', updatedAt: new Date() },
          }),
        ] : []),
      ])

      return NextResponse.json({
        data: {
          message: 'Report unlocked with credit pack',
          method: 'credit_pack',
          amountPence: 0,
        },
      })
    }

    // Subscriber flow: charge via Stripe
    const chargeResult = await charge(user.id, method.reason, method.amountPence, report.id)

    // Unlock report + mark invite PAID
    await prisma.$transaction(async (tx) => {
      await tx.financialReport.update({
        where: { id: report.id },
        data: { isLocked: false },
      })
      if (report.inviteId) {
        await tx.screeningInvite.update({
          where: { id: report.inviteId },
          data: { status: 'PAID', updatedAt: new Date() },
        })
      }
    })

    return NextResponse.json({
      data: {
        message: 'Payment successful',
        method: 'subscriber',
        chargeId: chargeResult.chargeId,
        amountPence: method.amountPence,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    if (message === 'No payment method on file') {
      return NextResponse.json({ error: message }, { status: 402 })
    }
    console.error('[payment/charge POST]', err)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}
