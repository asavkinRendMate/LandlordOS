import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { uploadInspectionPhoto, getInspectionPhotoUrl } from '@/lib/inspection-storage'

export async function GET(_req: Request, { params }: { params: { reportId: string } }) {
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

    const photos = await prisma.inspectionPhoto.findMany({
      where: { inspectionId: params.reportId },
      orderBy: { createdAt: 'asc' },
    })

    const photosWithUrls = await Promise.all(
      photos.map(async (p) => ({
        ...p,
        signedUrl: await getInspectionPhotoUrl(p.fileUrl).catch(() => null),
      })),
    )

    return NextResponse.json({ data: photosWithUrls })
  } catch (err) {
    console.error('[inspection photos GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { reportId: string } }) {
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
    const storagePath = await uploadInspectionPhoto(
      inspection.propertyId,
      params.reportId,
      roomId ?? 'general',
      photoId,
      file,
    )

    const photo = await prisma.inspectionPhoto.create({
      data: {
        id: photoId,
        inspectionId: params.reportId,
        roomId: roomId || null,
        roomName,
        uploadedBy: 'LANDLORD',
        uploaderName: uploaderUser?.name ?? uploaderUser?.email ?? 'Landlord',
        fileUrl: storagePath,
        caption: caption || null,
        condition: condition || null,
      },
    })

    const signedUrl = await getInspectionPhotoUrl(storagePath).catch(() => null)

    return NextResponse.json({ data: { ...photo, signedUrl } }, { status: 201 })
  } catch (err) {
    console.error('[inspection photos POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
