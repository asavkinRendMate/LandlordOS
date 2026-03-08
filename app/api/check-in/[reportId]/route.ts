import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { getCheckInPhotoUrl } from '@/lib/check-in-storage'
import { sendEmail } from '@/lib/resend'
import { checkInReviewHtml } from '@/lib/email-templates'
import { env } from '@/lib/env'
import { generateCheckInPdf } from '@/lib/check-in-pdf'

export async function GET(_req: Request, { params }: { params: { reportId: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const report = await prisma.checkInReport.findFirst({
      where: { id: params.reportId },
      include: {
        property: { select: { id: true, userId: true, line1: true, line2: true, city: true, postcode: true, name: true } },
        tenant: { select: { id: true, name: true, email: true } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!report || report.property.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const photosWithUrls = await Promise.all(
      report.photos.map(async (photo) => ({
        ...photo,
        signedUrl: await getCheckInPhotoUrl(photo.fileUrl).catch(() => null),
      })),
    )

    return NextResponse.json({
      data: {
        ...report,
        photos: photosWithUrls,
      },
    })
  } catch (err) {
    console.error('[check-in/[reportId] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

const patchSchema = z.object({
  status: z.enum(['PENDING', 'AGREED']).optional(),
  tenantId: z.string().optional(),
})

export async function PATCH(req: Request, { params }: { params: { reportId: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const report = await prisma.checkInReport.findFirst({
      where: { id: params.reportId },
      include: {
        property: { select: { userId: true, line1: true, city: true, postcode: true } },
        tenant: { select: { name: true, email: true } },
      },
    })

    if (!report || report.property.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body: unknown = await req.json()
    const result = patchSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const updateData: Record<string, unknown> = {}

    if (result.data.tenantId) {
      updateData.tenantId = result.data.tenantId
    }

    if (result.data.status === 'PENDING') {
      updateData.status = 'PENDING'

      // Send email to tenant
      if (report.tenant?.email) {
        const address = [report.property.line1, report.property.city, report.property.postcode].filter(Boolean).join(', ')
        const landlord = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } })
        const landlordName = landlord?.name ?? landlord?.email ?? 'Your landlord'
        const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/check-in/${report.token}`

        await sendEmail({
          to: report.tenant.email,
          subject: `Please review your check-in report — ${address}`,
          html: checkInReviewHtml({
            tenantName: report.tenant.name,
            landlordName,
            propertyAddress: address,
            reviewUrl,
          }),
        })
      }
    }

    if (result.data.status === 'AGREED') {
      // Landlord confirming — check if tenant already confirmed
      updateData.landlordConfirmedAt = new Date()
      if (report.tenantConfirmedAt) {
        updateData.status = 'AGREED'
      } else {
        updateData.status = 'IN_REVIEW'
      }
    }

    const updated = await prisma.checkInReport.update({
      where: { id: params.reportId },
      data: updateData,
    })

    // Trigger PDF generation when both parties have agreed
    if (updated.status === 'AGREED') {
      generateCheckInPdf(params.reportId).catch((err) =>
        console.error('[check-in PDF generation failed]', err),
      )
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[check-in/[reportId] PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
