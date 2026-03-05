import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { getSignedUrl, deleteFile } from '@/lib/storage'

const BUCKET = 'tenant-documents'

// GET — signed URL for download (owner or self)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doc = await prisma.tenantDocument.findUnique({
      where: { id: params.id },
      include: { tenant: { include: { property: true } } },
    })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = doc.tenant.property.userId === user.id
    const isSelf  = doc.tenant.userId === user.id
    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const signedUrl = await getSignedUrl(doc.fileUrl, 3600, BUCKET)
    return NextResponse.json({ data: { signedUrl, document: doc } })
  } catch (err) {
    console.error('[tenant-documents/[id] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE — owner only
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doc = await prisma.tenantDocument.findUnique({
      where: { id: params.id },
      include: { tenant: { include: { property: true } } },
    })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (doc.tenant.property.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteFile(doc.fileUrl, BUCKET)
    await prisma.tenantDocument.delete({ where: { id: params.id } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('[tenant-documents/[id] DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
