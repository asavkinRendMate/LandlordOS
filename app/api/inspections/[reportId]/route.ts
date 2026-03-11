import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { getInspectionPhotoUrl } from '@/lib/inspection-storage'
import { sendEmail } from '@/lib/resend'
import { inspectionReviewHtml } from '@/lib/email-templates'
import { env } from '@/lib/env'
import { generateInspectionPdf } from '@/lib/inspection-pdf'
import { advanceScheduleIfPeriodic } from '@/lib/inspection-schedule'

export async function GET(_req: Request, { params }: { params: { reportId: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const inspection = await prisma.propertyInspection.findFirst({
      where: { id: params.reportId },
      include: {
        property: { select: { id: true, userId: true, line1: true, line2: true, city: true, postcode: true, name: true } },
        tenant: { select: { id: true, name: true, email: true } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!inspection || inspection.property.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const photosWithUrls = await Promise.all(
      inspection.photos.map(async (photo) => ({
        ...photo,
        signedUrl: await getInspectionPhotoUrl(photo.fileUrl).catch(() => null),
      })),
    )

    return NextResponse.json({
      data: {
        ...inspection,
        photos: photosWithUrls,
      },
    })
  } catch (err) {
    console.error('[inspections/[reportId] GET]', err)
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

    const inspection = await prisma.propertyInspection.findFirst({
      where: { id: params.reportId },
      include: {
        property: { select: { userId: true, line1: true, city: true, postcode: true } },
        tenant: { select: { name: true, email: true } },
      },
    })

    if (!inspection || inspection.property.userId !== user.id) {
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
      if (inspection.tenant?.email) {
        const address = [inspection.property.line1, inspection.property.city, inspection.property.postcode].filter(Boolean).join(', ')
        const landlord = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } })
        const landlordName = landlord?.name ?? landlord?.email ?? 'Your landlord'
        const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/tenant/inspection/${inspection.token}`

        await sendEmail({
          to: inspection.tenant.email,
          subject: `Please review your property inspection report — ${address}`,
          html: inspectionReviewHtml({
            tenantName: inspection.tenant.name,
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
      if (inspection.tenantConfirmedAt) {
        updateData.status = 'AGREED'
      } else {
        updateData.status = 'IN_REVIEW'
      }
    }

    const updated = await prisma.propertyInspection.update({
      where: { id: params.reportId },
      data: updateData,
    })

    // Trigger PDF generation when both parties have agreed
    if (updated.status === 'AGREED') {
      generateInspectionPdf(params.reportId).catch((err) =>
        console.error('[inspection PDF generation failed]', err),
      )
      // Advance periodic inspection schedule
      advanceScheduleIfPeriodic(params.reportId).catch((err) =>
        console.error('[advance schedule failed]', err),
      )
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[inspections/[reportId] PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
