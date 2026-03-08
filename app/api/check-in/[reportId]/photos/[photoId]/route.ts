import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { deleteCheckInPhoto } from '@/lib/check-in-storage'

export async function DELETE(
  _req: Request,
  { params }: { params: { reportId: string; photoId: string } },
) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const report = await prisma.checkInReport.findFirst({
      where: { id: params.reportId },
      include: { property: { select: { userId: true } } },
    })
    if (!report || report.property.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const photo = await prisma.checkInPhoto.findFirst({
      where: { id: params.photoId, reportId: params.reportId },
    })
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

    await deleteCheckInPhoto(photo.fileUrl).catch(() => {})
    await prisma.checkInPhoto.delete({ where: { id: params.photoId } })

    return NextResponse.json({ data: { id: params.photoId } })
  } catch (err) {
    console.error('[check-in photo DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
