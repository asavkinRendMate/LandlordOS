import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadInspectionPhoto, getInspectionPhotoUrl } from '@/lib/inspection-storage'

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const inspection = await prisma.propertyInspection.findUnique({
      where: { token: params.token },
      include: { tenant: { select: { id: true, name: true } } },
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    if (inspection.status === 'AGREED') {
      return NextResponse.json({ error: 'Inspection already agreed' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const roomId = formData.get('roomId') as string | null
    const roomName = formData.get('roomName') as string
    const caption = formData.get('caption') as string | null
    const condition = formData.get('condition') as string | null

    if (!file || !roomName) {
      return NextResponse.json({ error: 'File and roomName required' }, { status: 400 })
    }

    const photoId = crypto.randomUUID()
    const storagePath = await uploadInspectionPhoto(
      inspection.propertyId,
      inspection.id,
      roomId ?? 'general',
      photoId,
      file,
    )

    const photo = await prisma.inspectionPhoto.create({
      data: {
        id: photoId,
        inspectionId: inspection.id,
        roomId: roomId || null,
        roomName,
        uploadedBy: 'TENANT',
        uploaderName: inspection.tenant?.name ?? 'Tenant',
        fileUrl: storagePath,
        caption: caption || null,
        condition: condition || null,
      },
    })

    // Update inspection status to IN_REVIEW if it was PENDING
    if (inspection.status === 'PENDING') {
      await prisma.propertyInspection.update({
        where: { id: inspection.id },
        data: { status: 'IN_REVIEW' },
      })
    }

    const signedUrl = await getInspectionPhotoUrl(storagePath).catch(() => null)

    return NextResponse.json({ data: { ...photo, signedUrl } }, { status: 201 })
  } catch (err) {
    console.error('[inspections/token photos POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
