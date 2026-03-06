import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'

export async function POST(
  _req: Request,
  { params }: { params: { inviteId: string } },
) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { inviteId } = params

    const invite = await prisma.screeningInvite.findUnique({ where: { id: inviteId } })
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.landlordId !== user.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
    }

    // Find the completed report for this invite
    const report = await prisma.financialReport.findFirst({
      where: { inviteId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    })

    if (!report) {
      return NextResponse.json({ error: 'No completed report found' }, { status: 404 })
    }

    if (!report.isLocked) {
      return NextResponse.json({ data: { message: 'Report is already unlocked' } })
    }

    // Unlock the report and mark invite as paid (MOCK_PAID in beta)
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

    return NextResponse.json({ data: { message: 'Report unlocked', reportId: report.id } })
  } catch (err) {
    console.error('[screening/report/[inviteId]/unlock POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
