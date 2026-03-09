import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const invite = await prisma.applicationInvite.findUnique({
      where: { id: params.id },
      include: { property: { select: { userId: true } } },
    })

    if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (invite.property.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.applicationInvite.delete({ where: { id: params.id } })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('[application-invites/[id] DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
