import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { buildInspectionPDF } from '@/lib/pdf-mappers'
import { sendEmail } from '@/lib/resend'
import { inspectionCompleteHtml } from '@/lib/email-templates'
import { getSignedUrl, uploadFile, ensureBucket } from '@/lib/storage-url'

export const maxDuration = 60

export async function POST(_req: Request, { params }: { params: { reportId: string } }) {
  try {
    // Gate by internal secret
    const secret = _req.headers.get('x-internal-secret')
    if (!env.INTERNAL_SECRET || secret !== env.INTERNAL_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { reportId } = params

    const inspection = await prisma.propertyInspection.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        pdfUrl: true,
        token: true,
        property: {
          select: { line1: true, line2: true, city: true, postcode: true },
        },
        tenant: { select: { name: true, email: true } },
      },
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (inspection.status !== 'AGREED') {
      return NextResponse.json({ error: 'Inspection not agreed' }, { status: 400 })
    }

    // Skip if already generated
    if (inspection.pdfUrl) {
      const signedUrl = await getSignedUrl('documents', inspection.pdfUrl)
      return NextResponse.json({ pdfUrl: signedUrl })
    }

    // Generate PDF via pdf-mappers
    const buffer = await buildInspectionPDF(reportId)

    // Upload to storage — returns storage path
    await ensureBucket('documents')
    const storagePath = `inspections/${reportId}/inspection-report.pdf`
    await uploadFile('documents', storagePath, buffer)

    // Update DB with storage path (not signed URL)
    await prisma.propertyInspection.update({
      where: { id: reportId },
      data: { pdfUrl: storagePath, pdfGeneratedAt: new Date() },
    })

    // Generate signed URL for response
    const signedUrl = await getSignedUrl('documents', storagePath)

    // Send completion email to tenant
    if (inspection.tenant?.email) {
      const address = [inspection.property.line1, inspection.property.line2, inspection.property.city, inspection.property.postcode].filter(Boolean).join(', ')
      const downloadUrl = `${env.NEXT_PUBLIC_APP_URL}/tenant/inspection/${inspection.token}`

      await sendEmail({
        to: inspection.tenant.email,
        subject: `Your property inspection report is ready — ${address}`,
        html: inspectionCompleteHtml({
          tenantName: inspection.tenant.name,
          propertyAddress: address,
          downloadUrl,
        }),
      }).catch((err) => console.error('[generate-pdf] email failed:', err))
    }

    return NextResponse.json({ pdfUrl: signedUrl })
  } catch (err) {
    console.error('[generate-pdf]', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
