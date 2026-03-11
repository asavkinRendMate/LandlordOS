import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { inspectionNoticeHtml } from '@/lib/email-templates'
import { randomUUID } from 'crypto'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

/** POST — send legally required inspection notice to tenant */
export async function POST(_req: Request, { params }: { params: { reportId: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const inspection = await prisma.propertyInspection.findFirst({
      where: { id: params.reportId, property: { userId: user.id } },
      include: {
        property: { include: { user: { select: { name: true } } } },
        tenant: { select: { name: true, email: true } },
      },
    })
    if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!inspection.tenant) return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 })
    if (!inspection.scheduledDate) return NextResponse.json({ error: 'No scheduled date set' }, { status: 400 })

    // Generate notice token for acknowledge URL
    const noticeToken = randomUUID()

    await prisma.propertyInspection.update({
      where: { id: params.reportId },
      data: { noticeToken },
    })

    const propertyAddress = [
      inspection.property.line1,
      inspection.property.line2,
      inspection.property.city,
      inspection.property.postcode,
    ].filter(Boolean).join(', ')

    const scheduledDate = new Date(inspection.scheduledDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const landlordName = inspection.property.user?.name ?? 'Your landlord'

    await sendEmail({
      to: inspection.tenant.email,
      subject: `Inspection notice — ${propertyAddress}`,
      html: inspectionNoticeHtml({
        tenantName: inspection.tenant.name,
        propertyAddress,
        scheduledDate,
        scheduledTime: inspection.scheduledTime ?? undefined,
        landlordName,
        acknowledgeUrl: `${appUrl}/tenant/inspection/${inspection.token}?acknowledge=true`,
      }),
    })

    return NextResponse.json({ data: { sent: true } })
  } catch (err) {
    console.error('[inspections/[reportId]/notice POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
