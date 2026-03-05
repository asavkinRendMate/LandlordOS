import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { deleteMaintenancePhoto } from '@/lib/maintenance-storage'

// DELETE /api/maintenance/[id]/photos/[photoId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id: requestId, photoId } = await params

    const photo = await prisma.maintenancePhoto.findUnique({
      where: { id: photoId },
      include: {
        request: {
          include: {
            property: { select: { userId: true } },
            tenant:   { select: { userId: true } },
          },
        },
      },
    })

    if (!photo || photo.requestId !== requestId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isOwner  = photo.request.property.userId === user.id
    const isTenant = photo.request.tenant.userId === user.id

    // Tenant can only delete their own photos; landlord can delete any
    if (!isOwner && (!isTenant || photo.uploadedBy !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (photo.fileUrl) {
      await deleteMaintenancePhoto(photo.fileUrl)
    }

    await prisma.maintenancePhoto.delete({ where: { id: photoId } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('[DELETE /api/maintenance/[id]/photos/[photoId]]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
