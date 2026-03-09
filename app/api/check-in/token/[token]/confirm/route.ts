import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { checkInTenantResponseHtml } from '@/lib/email-templates'
import { env } from '@/lib/env'
import { generateCheckInPdf } from '@/lib/check-in-pdf'

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const report = await prisma.checkInReport.findUnique({
      where: { token: params.token },
      include: {
        property: {
          select: {
            id: true,
            line1: true,
            city: true,
            postcode: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        tenant: { select: { name: true } },
      },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.status === 'AGREED') {
      return NextResponse.json({ error: 'Report already agreed' }, { status: 400 })
    }

    const body = await req.json() as { action: 'confirm' | 'dispute'; note?: string }

    const updateData: Record<string, unknown> = {}

    if (body.action === 'confirm') {
      updateData.tenantConfirmedAt = new Date()
      // If landlord already confirmed, both have now agreed
      if (report.landlordConfirmedAt) {
        updateData.status = 'AGREED'
      } else {
        updateData.status = 'IN_REVIEW'
      }
    } else if (body.action === 'dispute') {
      updateData.status = 'DISPUTED'
    }

    const updated = await prisma.checkInReport.update({
      where: { id: report.id },
      data: updateData,
    })

    // Trigger PDF generation when both parties have agreed
    if (updated.status === 'AGREED') {
      generateCheckInPdf(report.id).catch((err) =>
        console.error('[check-in PDF generation failed]', err),
      )
    }

    // Notify landlord (non-blocking — don't let email failure crash the endpoint)
    const landlord = report.property.user
    if (landlord) {
      const address = [report.property.line1, report.property.city, report.property.postcode].filter(Boolean).join(', ')
      const checkInUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard/properties/${report.property.id}/check-in?reportId=${report.id}`

      try {
        await sendEmail({
          to: landlord.email,
          subject: `${report.tenant?.name ?? 'Your tenant'} has ${body.action === 'confirm' ? 'confirmed' : 'disputed'} the check-in report`,
          html: checkInTenantResponseHtml({
            landlordName: landlord.name ?? 'there',
            tenantName: report.tenant?.name ?? 'Your tenant',
            propertyAddress: address,
            action: body.action === 'confirm' ? 'confirmed' : 'disputed',
            checkInUrl,
            note: body.action === 'dispute' ? body.note : undefined,
          }),
        })
      } catch (emailErr) {
        console.error('[check-in/token confirm] email send failed:', emailErr)
      }
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[check-in/token confirm POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
