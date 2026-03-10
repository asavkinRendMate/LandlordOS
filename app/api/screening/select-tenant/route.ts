import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { sendEmail } from '@/lib/resend'
import { tenantSelectedHtml, applicantRejectedHtml } from '@/lib/email-templates'

const schema = z.object({
  inviteId: z.string().min(1, { error: 'Invalid invite ID' }),
  propertyId: z.string().min(1, { error: 'Property ID is required' }),
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

    const { inviteId, propertyId } = parsed.data

    // Verify property belongs to user
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Check no active tenant already
    const existingTenant = await prisma.tenant.findFirst({
      where: { propertyId, status: { in: ['TENANT', 'INVITED'] } },
    })
    if (existingTenant) {
      return NextResponse.json({ error: 'This property already has an active tenant' }, { status: 400 })
    }

    const landlord = await prisma.user.findUnique({ where: { id: user.id } })
    const landlordName = landlord?.name ?? 'Your landlord'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'
    const address = [property.line1, property.line2, property.city, property.postcode].filter(Boolean).join(', ')

    // ── Candidate flow (applied via /apply/[propertyId]) ───────────────────
    if (inviteId.startsWith('candidate-')) {
      const candidateId = inviteId.replace('candidate-', '')
      const candidate = await prisma.tenant.findFirst({
        where: { id: candidateId, propertyId, status: 'CANDIDATE' },
      })
      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
      }

      // Reject other candidates for this property
      const otherCandidates = await prisma.tenant.findMany({
        where: { propertyId, status: 'CANDIDATE', id: { not: candidateId } },
      })

      const result = await prisma.$transaction(async (tx) => {
        // Promote candidate to INVITED
        const tenant = await tx.tenant.update({
          where: { id: candidateId },
          data: {
            status: 'INVITED',
            onboardingState: {
              rightToRent: false,
              deposit: false,
              rentSetup: false,
              tenancyAgreement: false,
            },
          },
        })

        // Create a pending tenancy
        await tx.tenancy.create({
          data: {
            propertyId,
            tenantId: tenant.id,
            status: 'PENDING',
          },
        })

        // Update property status
        await tx.property.update({
          where: { id: propertyId },
          data: { status: 'OFFER_ACCEPTED' },
        })

        // Mark other candidates as FORMER_TENANT (rejected)
        if (otherCandidates.length > 0) {
          await tx.tenant.updateMany({
            where: { id: { in: otherCandidates.map((c) => c.id) } },
            data: { status: 'FORMER_TENANT' },
          })
        }

        return tenant
      })

      // Send winner email
      const portalLink = `${appUrl}/tenant/join/${result.inviteToken}`
      await sendEmail({
        to: candidate.email,
        subject: `You've been selected for ${address}`,
        html: tenantSelectedHtml({
          candidateName: candidate.name,
          propertyAddress: address,
          landlordName,
          portalLink,
        }),
      })

      // Send rejection emails
      for (const rejected of otherCandidates) {
        sendEmail({
          to: rejected.email,
          subject: `Update on your application for ${address}`,
          html: applicantRejectedHtml({
            candidateName: rejected.name,
            propertyAddress: address,
            landlordName,
          }),
        }).catch((err) => console.error('[select-tenant rejection email]', err))
      }

      return NextResponse.json({
        data: {
          tenantId: result.id,
          tenantName: result.name,
          tenantEmail: result.email,
          inviteToken: result.inviteToken,
          rejectedCount: otherCandidates.length,
        },
      })
    }

    // ── Screening invite flow ──────────────────────────────────────────────
    const invite = await prisma.screeningInvite.findFirst({
      where: { id: inviteId, landlordId: user.id },
      include: {
        reports: {
          where: { status: 'COMPLETED' },
          take: 1,
        },
      },
    })
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    if (invite.status !== 'COMPLETED' && invite.status !== 'PAID') {
      return NextResponse.json({ error: 'Invite has not been completed yet' }, { status: 400 })
    }

    // Get all other invites for this property to reject
    const allInvites = await prisma.screeningInvite.findMany({
      where: {
        landlordId: user.id,
        propertyAddress: invite.propertyAddress,
        id: { not: inviteId },
        rejectionSentAt: null,
        status: { in: ['PENDING', 'STARTED', 'COMPLETED', 'PAID'] },
      },
    })

    // Transaction: create tenant + tenancy, update property status, mark rejections
    const result = await prisma.$transaction(async (tx) => {
      // Create Tenant record (status INVITED — becomes TENANT when they confirm)
      const tenant = await tx.tenant.create({
        data: {
          propertyId,
          name: invite.candidateName,
          email: invite.candidateEmail,
          status: 'INVITED',
          onboardingState: {
            rightToRent: false,
            deposit: false,
            rentSetup: false,
            tenancyAgreement: false,
          },
        },
      })

      // Create a pending tenancy
      await tx.tenancy.create({
        data: {
          propertyId,
          tenantId: tenant.id,
          monthlyRent: invite.monthlyRentPence,
          status: 'PENDING',
        },
      })

      // Update property status to OFFER_ACCEPTED
      await tx.property.update({
        where: { id: propertyId },
        data: { status: 'OFFER_ACCEPTED' },
      })

      // Mark rejected invites
      if (allInvites.length > 0) {
        await tx.screeningInvite.updateMany({
          where: { id: { in: allInvites.map((i) => i.id) } },
          data: { rejectionSentAt: new Date() },
        })
      }

      return tenant
    })

    // Send winner email
    const portalLink = `${appUrl}/tenant/join/${result.inviteToken}`
    await sendEmail({
      to: invite.candidateEmail,
      subject: `You've been selected for ${address}`,
      html: tenantSelectedHtml({
        candidateName: invite.candidateName,
        propertyAddress: address,
        landlordName,
        portalLink,
      }),
    })

    // Send rejection emails (fire and forget — don't block response)
    for (const rejected of allInvites) {
      sendEmail({
        to: rejected.candidateEmail,
        subject: `Update on your application for ${address}`,
        html: applicantRejectedHtml({
          candidateName: rejected.candidateName,
          propertyAddress: address,
          landlordName,
        }),
      }).catch((err) => console.error('[select-tenant rejection email]', err))
    }

    return NextResponse.json({
      data: {
        tenantId: result.id,
        tenantName: result.name,
        tenantEmail: result.email,
        inviteToken: result.inviteToken,
        rejectedCount: allInvites.length,
      },
    })
  } catch (err) {
    console.error('[screening/select-tenant POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
