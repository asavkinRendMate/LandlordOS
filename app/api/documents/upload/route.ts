import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { z } from 'zod'
import { DocumentType } from '@prisma/client'

const uploadSchema = z.object({
  propertyId: z.string().min(1),
  documentType: z.nativeEnum(DocumentType),
  expiryDate: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const propertyId = formData.get('propertyId') as string
    const documentType = formData.get('documentType') as string
    const expiryDate = formData.get('expiryDate') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const parsed = uploadSchema.safeParse({ propertyId, documentType, expiryDate: expiryDate ?? undefined })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid fields', details: parsed.error.flatten() }, { status: 400 })
    }

    // Verify ownership
    const property = await prisma.property.findFirst({
      where: { id: parsed.data.propertyId, userId: user.id },
    })
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    // Generate a unique doc ID for the storage path
    const docId = crypto.randomUUID()
    const storagePath = `${user.id}/${parsed.data.propertyId}/${docId}/${file.name}`

    await uploadFile(storagePath, file)

    const document = await prisma.propertyDocument.create({
      data: {
        id: docId,
        propertyId: parsed.data.propertyId,
        documentType: parsed.data.documentType,
        fileName: file.name,
        fileUrl: storagePath,
        fileSize: file.size,
        mimeType: file.type,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      },
    })

    return NextResponse.json({ data: document })
  } catch (err) {
    console.error('[documents/upload POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
