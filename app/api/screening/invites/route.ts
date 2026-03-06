import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'

export async function GET() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const invites = await prisma.screeningInvite.findMany({
      where: { landlordId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        reports: {
          select: {
            id: true,
            status: true,
            totalScore: true,
            grade: true,
            isLocked: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    // Lazily expire old invites (7 days)
    const now = new Date()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const data = invites.map((inv) => {
      const isExpired = inv.status === 'PENDING' && (now.getTime() - inv.createdAt.getTime()) > sevenDaysMs
      return {
        id: inv.id,
        candidateName: inv.candidateName,
        candidateEmail: inv.candidateEmail,
        propertyAddress: inv.propertyAddress,
        monthlyRentPence: inv.monthlyRentPence,
        status: isExpired ? 'EXPIRED' : inv.status,
        createdAt: inv.createdAt.toISOString(),
        report: inv.reports[0] ?? null,
      }
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[screening/invites GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
