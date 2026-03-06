import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { applicationReceivedHtml, newApplicationHtml } from '@/lib/email-templates'

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
    const tenant = await prisma.tenant.create({
      data: {
        propertyId,
        name,
        email,
        phone: phone ?? null,
        status: 'CANDIDATE',
      },
    })

    const propertyAddress = [property.line1, property.city, property.postcode].filter(Boolean).join(', ')
    const landlordFirstName = property.user.name?.trim() ? property.user.name.split(' ')[0] : 'Your landlord'

    // Email to applicant
    await sendEmail({
      to: email,
      subject: `Application received — ${propertyAddress}`,
      html: applicationReceivedHtml({
        firstName: name.split(' ')[0],
        propertyAddress,
        landlordFirstName,
      }),
    })

    // Email to landlord
    await sendEmail({
      to: property.user.email,
      subject: `New application for ${propertyAddress}`,
      html: newApplicationHtml({
        landlordFirstName,
        propertyAddress,
        applicantName: name,
        applicantEmail: email,
        message: message ?? undefined,
      }),
    })

    return NextResponse.json({ data: { tenantId: tenant.id } }, { status: 201 })
  } catch (err) {
    console.error('[tenant/apply POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
