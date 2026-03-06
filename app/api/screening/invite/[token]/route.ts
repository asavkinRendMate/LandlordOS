import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
) {
  try {
    const { token } = params

    const invite = await prisma.screeningInvite.findUnique({
      where: { token },
      include: {
        reports: {
          select: { id: true, status: true, totalScore: true, grade: true, verificationToken: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check expiry for PENDING invites
    const now = new Date()
    const isExpired = invite.status === 'PENDING' && (now.getTime() - invite.createdAt.getTime()) > SEVEN_DAYS_MS
    if (isExpired) {
      await prisma.screeningInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED', updatedAt: now },
      })
      return NextResponse.json({
        data: {
          id: invite.id,
          candidateName: invite.candidateName,
          propertyAddress: invite.propertyAddress,
          monthlyRentPence: invite.monthlyRentPence,
          status: 'EXPIRED',
          report: null,
        },
      })
    }

    return NextResponse.json({
      data: {
        id: invite.id,
        candidateName: invite.candidateName,
        candidateEmail: invite.candidateEmail,
        propertyAddress: invite.propertyAddress,
        monthlyRentPence: invite.monthlyRentPence,
        status: invite.status,
        report: invite.reports[0] ?? null,
      },
    })
  } catch (err) {
    console.error('[screening/invite/[token] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
