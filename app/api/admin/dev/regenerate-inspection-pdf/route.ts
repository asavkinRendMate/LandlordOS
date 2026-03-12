import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { buildInspectionPDF } from '@/lib/pdf-mappers'
import { createServerClient } from '@/lib/supabase/server'

const schema = z.object({
  inspectionId: z.string().min(1),
})

export async function POST(req: Request) {
  const authError = await verifyAdminSession()
  if (authError) return authError

  try {
    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid inspection ID' }, { status: 400 })

    const { inspectionId } = result.data

    const inspection = await prisma.propertyInspection.findUnique({
      where: { id: inspectionId },
      select: { id: true },
    })
    if (!inspection) return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })

    // Generate PDF
    const buffer = await buildInspectionPDF(inspectionId)

    // Upload to storage (overwrite existing)
    const storagePath = `inspections/${inspectionId}/inspection-report.pdf`
    const supabase = createServerClient()

    const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (uploadError) {
      console.error('[admin/dev/regenerate-inspection-pdf] upload failed:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Update DB
    await prisma.propertyInspection.update({
      where: { id: inspectionId },
      data: { pdfUrl: storagePath, pdfGeneratedAt: new Date() },
    })

    return NextResponse.json({ success: true, pdfUrl: storagePath })
  } catch (err) {
    console.error('[admin/dev/regenerate-inspection-pdf]', err)
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
