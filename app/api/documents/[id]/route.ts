import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { getSignedUrl, deleteFile } from '@/lib/storage'

// GET — return signed URL for download
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find document — allow access if owner of property OR tenant of property
    const doc = await prisma.propertyDocument.findUnique({
      where: { id: params.id },
      include: { property: true },
    })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = doc.property.userId === user.id
    const isTenant = !isOwner && await prisma.tenant.findFirst({
      where: {
        propertyId: doc.propertyId,
        userId: user.id,
        status: { in: ['TENANT', 'INVITED'] },
      },
    }) !== null

    if (!isOwner && !isTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const signedUrl = await getSignedUrl(doc.fileUrl, 3600)
    return NextResponse.json({ data: { signedUrl, document: doc } })
  } catch (err) {
    console.error('[documents/[id] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// DELETE — remove from storage and DB
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doc = await prisma.propertyDocument.findUnique({
      where: { id: params.id },
      include: { property: true },
    })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (doc.property.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteFile(doc.fileUrl)
    await prisma.propertyDocument.delete({ where: { id: params.id } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('[documents/[id] DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
