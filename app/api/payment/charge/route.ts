import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { charge, CHARGE_AMOUNTS, type ChargeReason } from '@/lib/payment-service'

const SCREENING_REASONS = new Set<ChargeReason>(['SCREENING_FIRST', 'SCREENING_ADDITIONAL'])

const schema = z.object({
  reason: z.enum([
    'SCREENING_FIRST',
    'SCREENING_ADDITIONAL',
    'STANDALONE_SCREENING',
    'APT_CONTRACT',
    'INVENTORY_REPORT',
    'DISPUTE_PACK',
  ]),
  inviteId: z.string().uuid().optional(),
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

    const { reason, inviteId } = result.data
    const amountPence = CHARGE_AMOUNTS[reason]

    // Charge the user
    const chargeResult = await charge(user.id, reason, amountPence)
    if (!chargeResult.success) {
      return NextResponse.json({ error: 'Payment failed' }, { status: 402 })
    }

    // For screening charges: unlock report + mark invite PAID
    if (SCREENING_REASONS.has(reason) && inviteId) {
      const invite = await prisma.screeningInvite.findUnique({ where: { id: inviteId } })
      if (!invite || invite.landlordId !== user.id) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
      }

      const report = await prisma.financialReport.findFirst({
        where: { inviteId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
      })

      if (report) {
        await prisma.$transaction([
          prisma.financialReport.update({
            where: { id: report.id },
            data: { isLocked: false },
          }),
          prisma.screeningInvite.update({
            where: { id: inviteId },
            data: { status: 'PAID', updatedAt: new Date() },
          }),
        ])
      }
    }

    return NextResponse.json({
      data: {
        message: 'Payment successful',
        chargeId: chargeResult.chargeId,
        amountPence,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    if (message === 'No payment method on file') {
      return NextResponse.json({ error: message }, { status: 402 })
    }
    console.error('[payment/charge POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
