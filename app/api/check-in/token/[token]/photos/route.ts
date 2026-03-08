import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadCheckInPhoto, getCheckInPhotoUrl } from '@/lib/check-in-storage'

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const report = await prisma.checkInReport.findUnique({
      where: { token: params.token },
      include: { tenant: { select: { id: true, name: true } } },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.status === 'AGREED') {
      return NextResponse.json({ error: 'Report already agreed' }, { status: 400 })
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
    const storagePath = await uploadCheckInPhoto(
      report.propertyId,
      report.id,
      roomId ?? 'general',
      photoId,
      file,
    )

    const photo = await prisma.checkInPhoto.create({
      data: {
        id: photoId,
        reportId: report.id,
        roomId: roomId || null,
        roomName,
        uploadedBy: 'TENANT',
        uploaderName: report.tenant?.name ?? 'Tenant',
        fileUrl: storagePath,
        caption: caption || null,
        condition: condition || null,
      },
    })

    // Update report status to IN_REVIEW if it was PENDING
    if (report.status === 'PENDING') {
      await prisma.checkInReport.update({
        where: { id: report.id },
        data: { status: 'IN_REVIEW' },
      })
    }

    const signedUrl = await getCheckInPhotoUrl(storagePath).catch(() => null)

    return NextResponse.json({ data: { ...photo, signedUrl } }, { status: 201 })
  } catch (err) {
    console.error('[check-in/token photos POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
