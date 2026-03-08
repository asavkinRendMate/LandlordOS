import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { deleteFile } from '@/lib/storage'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const invite = await prisma.screeningInvite.findUnique({
      where: { id: params.id },
      include: {
        reports: {
          select: { id: true, statementFiles: true },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (invite.landlordId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete uploaded PDFs from storage
    for (const report of invite.reports) {
      if (report.statementFiles && Array.isArray(report.statementFiles)) {
        for (const file of report.statementFiles) {
          const f = file as { storagePath?: string }
          if (f.storagePath) {
            try {
              await deleteFile(f.storagePath, 'bank-statements')
            } catch {
              // Storage cleanup is best-effort
            }
          }
        }
      }
    }

    // Delete reports then invite (reports have FK to invite)
    if (invite.reports.length > 0) {
      await prisma.financialReport.deleteMany({
        where: { inviteId: invite.id },
      })
    }

    await prisma.screeningInvite.delete({
      where: { id: invite.id },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('[screening/invites/[id] DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
