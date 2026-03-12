import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { buildAptContractPDF } from '@/lib/pdf-mappers'
import { createServerClient } from '@/lib/supabase/server'

const schema = z.object({
  tenancyId: z.string().min(1),
})

export async function POST(req: Request) {
  const authError = await verifyAdminSession()
  if (authError) return authError

  try {
    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid tenancy ID' }, { status: 400 })

    const { tenancyId } = result.data

    const contract = await prisma.tenancyContract.findUnique({
      where: { tenancyId },
    })
    if (!contract) return NextResponse.json({ error: 'No contract found for this tenancy' }, { status: 404 })

    // Generate PDF
    const pdfBuffer = await buildAptContractPDF(tenancyId)

    // Upload to storage (overwrite existing)
    const storagePath = `contracts/${tenancyId}/contract.pdf`
    const supabase = createServerClient()

    const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (uploadError) {
      console.error('[admin/dev/regenerate-contract] upload failed:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Update contract record
    await prisma.tenancyContract.update({
      where: { tenancyId },
      data: { pdfUrl: storagePath },
    })

    return NextResponse.json({ success: true, pdfUrl: storagePath })
  } catch (err) {
    console.error('[admin/dev/regenerate-contract]', err)
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
