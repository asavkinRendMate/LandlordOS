import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { sendEmail } from '@/lib/resend'
import { candidateInviteHtml } from '@/lib/email-templates'

const schema = z.object({
  senderName: z.string().min(1, { error: 'Your name is required' }),
  candidateName: z.string().min(1, { error: 'Candidate name is required' }),
  candidateEmail: z.string().email({ error: 'Valid email is required' }),
  propertyAddress: z.string().min(1, { error: 'Property address is required' }),
  monthlyRent: z.number().positive({ error: 'Rent must be positive' }),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { senderName, candidateName, candidateEmail, propertyAddress, monthlyRent } = parsed.data
    const monthlyRentPence = Math.round(monthlyRent * 100)

    // Upsert user row and update name
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: senderName.trim() },
      create: { id: user.id, email: user.email!, name: senderName.trim() },
    })

    // Create the invite
    const invite = await prisma.screeningInvite.create({
      data: {
        landlordId: user.id,
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim().toLowerCase(),
        propertyAddress: propertyAddress.trim(),
        monthlyRentPence,
      },
    })

    // Send invite email to candidate
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'
    const applyUrl = `${appUrl}/screening/apply/${invite.token}`
    const landlordName = senderName.trim()

    await sendEmail({
      to: candidateEmail.trim().toLowerCase(),
      subject: `${landlordName} invited you to complete a financial check`,
      html: candidateInviteHtml({
        candidateName: candidateName.trim(),
        landlordName,
        propertyAddress: propertyAddress.trim(),
        applyUrl,
      }),
    })

    return NextResponse.json({
      data: {
        id: invite.id,
        token: invite.token,
        candidateName: invite.candidateName,
        candidateEmail: invite.candidateEmail,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[screening/invite POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
