import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { uploadMaintenancePhoto, getMaintenancePhotoUrl } from '@/lib/maintenance-storage'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_PHOTOS_PER_REQUEST = 20

// POST /api/maintenance/[id]/photos
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id: requestId } = await params

    // Fetch request to verify access
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        property: { select: { userId: true } },
        tenant:   { select: { userId: true } },
        _count:   { select: { photos: true } },
      },
    })
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner  = request.property.userId === user.id
    const isTenant = request.tenant.userId === user.id
    if (!isOwner && !isTenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Check total photo limit
    if (request._count.photos >= MAX_PHOTOS_PER_REQUEST) {
      return NextResponse.json({ error: `Maximum ${MAX_PHOTOS_PER_REQUEST} photos per request` }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const role = formData.get('role') as string | null
    const caption = formData.get('caption') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are accepted' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
    }
    if (!role || !['TENANT', 'LANDLORD'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role — must be TENANT or LANDLORD' }, { status: 400 })
    }

    // Create DB record first to get the ID for storage path
    const photo = await prisma.maintenancePhoto.create({
      data: {
        requestId,
        uploadedBy: user.id,
        role,
        fileUrl: '', // placeholder, updated after upload
        fileName: file.name,
        fileSize: file.size,
        caption: caption || null,
      },
    })

    // Upload to storage
    const fileUrl = await uploadMaintenancePhoto(requestId, role, photo.id, file)

    // Update record with real storage path
    const updated = await prisma.maintenancePhoto.update({
      where: { id: photo.id },
      data: { fileUrl },
    })

    return NextResponse.json({ data: updated }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/maintenance/[id]/photos]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// GET /api/maintenance/[id]/photos
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id: requestId } = await params

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        property: { select: { userId: true } },
        tenant:   { select: { userId: true } },
        photos:   { orderBy: { uploadedAt: 'asc' } },
      },
    })
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner  = request.property.userId === user.id
    const isTenant = request.tenant.userId === user.id
    if (!isOwner && !isTenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Generate signed URLs for all photos
    const photosWithUrls = await Promise.all(
      request.photos.map(async (p) => {
        const signedUrl = p.fileUrl
          ? await getMaintenancePhotoUrl(p.fileUrl).catch(() => null)
          : null
        return { ...p, signedUrl }
      }),
    )

    return NextResponse.json({ data: photosWithUrls })
  } catch (err) {
    console.error('[GET /api/maintenance/[id]/photos]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
