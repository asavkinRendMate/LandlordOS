import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { TenantDocumentType } from '@prisma/client'

const BUCKET = 'tenant-documents'

const schema = z.object({
  tenantId: z.string().min(1),
  documentType: z.nativeEnum(TenantDocumentType),
  expiryDate: z.string().optional(),
  note: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const parsed = schema.safeParse({
      tenantId:     formData.get('tenantId'),
      documentType: formData.get('documentType'),
      expiryDate:   formData.get('expiryDate') ?? undefined,
      note:         formData.get('note') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid fields' }, { status: 400 })
    }

    const { tenantId, documentType, expiryDate, note } = parsed.data

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { property: true },
    })
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const isOwner = tenant.property.userId === user.id
    const isSelf  = tenant.userId === user.id
    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const docId = crypto.randomUUID()
    const storagePath = `${tenant.propertyId}/${tenantId}/${docId}/${file.name}`
    await uploadFile(storagePath, file, BUCKET)

    const document = await prisma.tenantDocument.create({
      data: {
        id:           docId,
        tenantId,
        documentType,
        fileName:     file.name,
        fileUrl:      storagePath,
        fileSize:     file.size,
        mimeType:     file.type,
        uploadedBy:   user.id,
        expiryDate:   expiryDate ? new Date(expiryDate) : null,
        note:         note ?? null,
      },
    })

    return NextResponse.json({ data: document })
  } catch (err) {
    console.error('[tenant-documents/upload POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
