import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { uploadCheckInPhoto, getCheckInPhotoUrl } from '@/lib/check-in-storage'

export async function GET(_req: Request, { params }: { params: { reportId: string } }) {
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

    const photos = await prisma.checkInPhoto.findMany({
      where: { reportId: params.reportId },
      orderBy: { createdAt: 'asc' },
    })

    const photosWithUrls = await Promise.all(
      photos.map(async (p) => ({
        ...p,
        signedUrl: await getCheckInPhotoUrl(p.fileUrl).catch(() => null),
      })),
    )

    return NextResponse.json({ data: photosWithUrls })
  } catch (err) {
    console.error('[check-in photos GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { reportId: string } }) {
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

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const roomId = formData.get('roomId') as string | null
    const roomName = formData.get('roomName') as string
    const caption = formData.get('caption') as string | null
    const condition = formData.get('condition') as string | null

    if (!file || !roomName) {
      return NextResponse.json({ error: 'File and roomName required' }, { status: 400 })
    }

    const uploaderUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    })

    const photoId = crypto.randomUUID()
    const storagePath = await uploadCheckInPhoto(
      report.propertyId,
      params.reportId,
      roomId ?? 'general',
      photoId,
      file,
    )

    const photo = await prisma.checkInPhoto.create({
      data: {
        id: photoId,
        reportId: params.reportId,
        roomId: roomId || null,
        roomName,
        uploadedBy: 'LANDLORD',
        uploaderName: uploaderUser?.name ?? uploaderUser?.email ?? 'Landlord',
        fileUrl: storagePath,
        caption: caption || null,
        condition: condition || null,
      },
    })

    const signedUrl = await getCheckInPhotoUrl(storagePath).catch(() => null)

    return NextResponse.json({ data: { ...photo, signedUrl } }, { status: 201 })
  } catch (err) {
    console.error('[check-in photos POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
