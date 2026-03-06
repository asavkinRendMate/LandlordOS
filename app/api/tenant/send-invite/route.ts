import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { tenantInviteHtml } from '@/lib/email-templates'

const schema = z.object({
  tenantId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const tenant = await prisma.tenant.findFirst({
      where: { id: result.data.tenantId, property: { userId: user.id } },
      include: { property: true },
    })
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const joinLink = `${appUrl}/tenant/join/${tenant.inviteToken}`
    const propertyAddress = [tenant.property.line1, tenant.property.city, tenant.property.postcode]
      .filter(Boolean)
      .join(', ')

    await sendEmail({
      to: tenant.email,
      subject: "You've been added to LetSorted — confirm your details",
      html: tenantInviteHtml({
        firstName: tenant.name.split(' ')[0],
        propertyAddress,
        joinLink,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[tenant/send-invite POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
