import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'

const schema = z.object({
  propertyId: z.string().min(1),
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

    const { propertyId, email } = result.data

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const applyLink = `${appUrl}/apply/${property.id}`
    const propertyAddress = [property.line1, property.city, property.postcode].filter(Boolean).join(', ')

    await sendEmail({
      to: email,
      subject: `Apply for ${propertyAddress}`,
      html: `
        <p>Hi,</p>
        <p>You've been sent an application link for the property at <strong>${propertyAddress}</strong>.</p>
        <p>Click the link below to submit your application:</p>
        <p><a href="${applyLink}" style="color:#22c55e">Apply now →</a></p>
        <p>— The LetSorted team</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[tenant/application-link-email POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
