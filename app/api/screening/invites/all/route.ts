import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { deleteFile } from '@/lib/storage'

export async function DELETE() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Fetch all invites with their reports for storage cleanup
    const invites = await prisma.screeningInvite.findMany({
      where: { landlordId: user.id },
      include: {
        reports: {
          select: { id: true, statementFiles: true },
        },
      },
    })

    if (invites.length === 0) {
      return NextResponse.json({ data: { success: true, deleted: 0 } })
    }

    // Delete uploaded PDFs from storage (best-effort)
    for (const invite of invites) {
      for (const report of invite.reports) {
        if (report.statementFiles && Array.isArray(report.statementFiles)) {
          for (const file of report.statementFiles) {
            const f = file as { storagePath?: string }
            if (f.storagePath) {
              try {
                await deleteFile(f.storagePath, 'bank-statements')
              } catch {
                // Best-effort cleanup
              }
            }
          }
        }
      }
    }

    const inviteIds = invites.map((inv) => inv.id)

    // Delete reports then invites
    await prisma.financialReport.deleteMany({
      where: { inviteId: { in: inviteIds } },
    })

    const result = await prisma.screeningInvite.deleteMany({
      where: { landlordId: user.id },
    })

    return NextResponse.json({ data: { success: true, deleted: result.count } })
  } catch (err) {
    console.error('[screening/invites/all DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
