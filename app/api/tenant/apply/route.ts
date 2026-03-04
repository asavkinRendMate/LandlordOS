import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'

const schema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  currentAddress: z.string().min(1),
  employmentStatus: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'STUDENT', 'OTHER']),
  monthlyIncome: z.string().min(1),
  message: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { propertyId, name, email, phone, message } = result.data

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { user: true },
    })
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    // Create Tenant record as CANDIDATE
    await prisma.tenant.create({
      data: {
        propertyId,
        name,
        email,
        phone: phone ?? null,
        status: 'CANDIDATE',
      },
    })

    const propertyAddress = [property.line1, property.city, property.postcode].filter(Boolean).join(', ')
    const landlordFirstName = property.user.name?.split(' ')[0] ?? 'your landlord'

    // Email to applicant
    await sendEmail({
      to: email,
      subject: `Application received — ${propertyAddress}`,
      html: `
        <p>Hi ${name.split(' ')[0]},</p>
        <p>Thanks for applying for <strong>${propertyAddress}</strong>. ${landlordFirstName} will be in touch if your application is successful.</p>
        <p>— The LetSorted team</p>
      `,
    })

    // Email to landlord
    await sendEmail({
      to: property.user.email,
      subject: `New application for ${propertyAddress}`,
      html: `
        <p>Hi ${landlordFirstName},</p>
        <p>You have a new application for <strong>${propertyAddress}</strong> from <strong>${name}</strong> (${email}).</p>
        ${message ? `<p>Their message: <em>"${message}"</em></p>` : ''}
        <p>Log in to LetSorted to view and manage this application.</p>
        <p>— The LetSorted team</p>
      `,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[tenant/apply POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
