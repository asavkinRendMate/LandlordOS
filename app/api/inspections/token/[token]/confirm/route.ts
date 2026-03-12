import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { inspectionTenantResponseHtml } from '@/lib/email-templates'
import { env } from '@/lib/env'
import { advanceScheduleIfPeriodic } from '@/lib/inspection-schedule'

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const inspection = await prisma.propertyInspection.findUnique({
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

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    if (inspection.status === 'AGREED') {
      return NextResponse.json({ error: 'Inspection already agreed' }, { status: 400 })
    }

    const body = await req.json() as { action: 'confirm' | 'dispute'; note?: string }

    const updateData: Record<string, unknown> = {}

    if (body.action === 'confirm') {
      updateData.tenantConfirmedAt = new Date()
      // If landlord already confirmed, both have now agreed
      if (inspection.landlordConfirmedAt) {
        updateData.status = 'AGREED'
      } else {
        updateData.status = 'IN_REVIEW'
      }
    } else if (body.action === 'dispute') {
      updateData.status = 'DISPUTED'
    }

    const updated = await prisma.propertyInspection.update({
      where: { id: inspection.id },
      data: updateData,
    })

    // Trigger PDF generation when both parties have agreed (fire-and-forget)
    if (updated.status === 'AGREED') {
      const baseUrl = env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000'
      fetch(`${baseUrl}/api/inspections/${inspection.id}/generate-pdf`, {
        method: 'POST',
        headers: { 'x-internal-secret': env.INTERNAL_SECRET ?? '' },
      }).catch((err) => console.error('[inspection] PDF generation trigger failed:', err))

      // Advance periodic inspection schedule
      advanceScheduleIfPeriodic(inspection.id).catch((err) =>
        console.error('[advance schedule failed]', err),
      )
    }

    // Notify landlord (non-blocking — don't let email failure crash the endpoint)
    const landlord = inspection.property.user
    if (landlord) {
      const address = [inspection.property.line1, inspection.property.city, inspection.property.postcode].filter(Boolean).join(', ')
      const inspectionUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard/properties/${inspection.property.id}/inspection?reportId=${inspection.id}`

      try {
        await sendEmail({
          to: landlord.email,
          subject: `${inspection.tenant?.name ?? 'Your tenant'} has ${body.action === 'confirm' ? 'confirmed' : 'disputed'} the inspection report`,
          html: inspectionTenantResponseHtml({
            landlordName: landlord.name ?? 'there',
            tenantName: inspection.tenant?.name ?? 'Your tenant',
            propertyAddress: address,
            action: body.action === 'confirm' ? 'confirmed' : 'disputed',
            checkInUrl: inspectionUrl,
            note: body.action === 'dispute' ? body.note : undefined,
          }),
        })
      } catch (emailErr) {
        console.error('[inspections/token confirm] email send failed:', emailErr)
      }
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[inspections/token confirm POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
