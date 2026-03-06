import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: { token: string } },
) {
  try {
    const { token } = params

    const invite = await prisma.screeningInvite.findUnique({ where: { token } })
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.status !== 'PENDING') {
      return NextResponse.json({ data: { status: invite.status } })
    }

    await prisma.screeningInvite.update({
      where: { id: invite.id },
      data: { status: 'STARTED', updatedAt: new Date() },
    })

    return NextResponse.json({ data: { status: 'STARTED' } })
  } catch (err) {
    console.error('[screening/invite/[token]/started POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
