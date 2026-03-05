import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'

const schema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { propertyId, name, email } = result.data

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    const tenant = await prisma.tenant.create({
      data: {
        propertyId,
        name,
        email,
        status: 'INVITED',
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const joinLink = `${appUrl}/tenant/join/${tenant.inviteToken}`
    const propertyAddress = [property.line1, property.city, property.postcode]
      .filter(Boolean)
      .join(', ')

    await sendEmail({
      to: email,
      subject: "You've been added to LetSorted — confirm your details",
      html: `
        <p>Hi ${name.split(' ')[0]},</p>
        <p>Your landlord uses <strong>LetSorted</strong> to manage their property at <strong>${propertyAddress}</strong>.</p>
        <p>Please confirm your details and access your tenant portal by clicking the link below:</p>
        <p><a href="${joinLink}" style="color:#22c55e">Confirm my details →</a></p>
        <p>If you weren't expecting this email, you can safely ignore it.</p>
        <p>— The LetSorted team</p>
      `,
    })

    return NextResponse.json(
      { data: { tenantId: tenant.id, inviteToken: tenant.inviteToken } },
      { status: 201 },
    )
  } catch (err) {
    console.error('[tenant/invite POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
