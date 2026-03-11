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
    })

    // Batch-query reports linked to these invites
    const inviteIds = invites.map((inv) => inv.id)
    const reports = inviteIds.length > 0
      ? await prisma.financialReport.findMany({
          where: { inviteId: { in: inviteIds } },
          select: {
            id: true,
            inviteId: true,
            status: true,
            totalScore: true,
            grade: true,
            isLocked: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    // Map: inviteId → most recent report
    const reportByInvite = new Map<string, { id: string; status: string; totalScore: number | null; grade: string | null; isLocked: boolean }>()
    for (const r of reports) {
      if (r.inviteId && !reportByInvite.has(r.inviteId)) {
        reportByInvite.set(r.inviteId, {
          id: r.id,
          status: r.status,
          totalScore: r.totalScore,
          grade: r.grade,
          isLocked: r.isLocked,
        })
      }
    }

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
        report: reportByInvite.get(inv.id) ?? null,
      }
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[screening/invites GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
