import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { deleteInspectionPhoto } from '@/lib/inspection-storage'

export async function DELETE(
  _req: Request,
  { params }: { params: { reportId: string; photoId: string } },
) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const inspection = await prisma.propertyInspection.findFirst({
      where: { id: params.reportId },
      include: { property: { select: { userId: true } } },
    })
    if (!inspection || inspection.property.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const photo = await prisma.inspectionPhoto.findFirst({
      where: { id: params.photoId, inspectionId: params.reportId },
    })
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

    await deleteInspectionPhoto(photo.fileUrl).catch(() => {})
    await prisma.inspectionPhoto.delete({ where: { id: params.photoId } })

    return NextResponse.json({ data: { id: params.photoId } })
  } catch (err) {
    console.error('[inspection photo DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
