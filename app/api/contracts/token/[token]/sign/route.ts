import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { contractFullySignedLandlordHtml, contractFullySignedTenantHtml } from '@/lib/email-templates/contract'
import { env } from '@/lib/env'
import { buildAptContractPDF } from '@/lib/pdf-mappers'
import { uploadFile } from '@/lib/storage-url'
import { updateSubscriber } from '@/lib/mailerlite'

const schema = z.object({
  name: z.string().min(1).max(200),
})

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { name } = result.data
    const { token } = params

    // Look up contract by landlord or tenant token
    const contract = await prisma.tenancyContract.findFirst({
      where: {
        OR: [
          { landlordToken: token },
          { tenantToken: token },
        ],
      },
      include: {
        tenancy: {
          include: {
            property: {
              include: { user: { select: { name: true, email: true } } },
            },
            tenant: { select: { name: true, email: true } },
          },
        },
      },
    })

    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    // Determine role
    const isLandlord = contract.landlordToken === token
    const role = isLandlord ? 'landlord' : 'tenant'

    // Check contract is in a signable state
    if (contract.status === 'VOIDED') {
      return NextResponse.json({ error: 'This contract has been voided' }, { status: 400 })
    }
    if (contract.status === 'BOTH_SIGNED') {
      return NextResponse.json({ error: 'Contract is already fully signed' }, { status: 400 })
    }

    // Check not already signed by this party
    if (isLandlord && contract.landlordSignedAt) {
      return NextResponse.json({ error: 'You have already signed this contract' }, { status: 400 })
    }
    if (!isLandlord && contract.tenantSignedAt) {
      return NextResponse.json({ error: 'You have already signed this contract' }, { status: 400 })
    }

    // Validate name matches (case-insensitive, trimmed)
    const expectedName = isLandlord
      ? contract.tenancy.property.user?.name
      : contract.tenancy.tenant?.name

    if (expectedName && name.trim().toLowerCase() !== expectedName.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Name does not match our records. Please type your full name exactly as it appears.' }, { status: 400 })
    }

    // Get IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    // Determine new status
    const otherSigned = isLandlord ? !!contract.tenantSignedAt : !!contract.landlordSignedAt
    const newStatus = otherSigned ? 'BOTH_SIGNED' : (isLandlord ? 'LANDLORD_SIGNED' : 'TENANT_SIGNED')

    // Update
    const updateData = isLandlord
      ? { landlordSignedAt: new Date(), landlordSignedName: name.trim(), landlordSignedIp: ip, status: newStatus as 'LANDLORD_SIGNED' | 'BOTH_SIGNED' }
      : { tenantSignedAt: new Date(), tenantSignedName: name.trim(), tenantSignedIp: ip, status: newStatus as 'TENANT_SIGNED' | 'BOTH_SIGNED' }

    const updated = await prisma.tenancyContract.update({
      where: { id: contract.id },
      data: updateData,
    })

    // If BOTH_SIGNED, send emails to both parties
    if (newStatus === 'BOTH_SIGNED') {
      const tenant = contract.tenancy.tenant
      const landlord = contract.tenancy.property.user
      const propertyAddress = `${contract.tenancy.property.line1}, ${contract.tenancy.property.city} ${contract.tenancy.property.postcode}`
      const landlordName = landlord?.name ?? landlord?.email ?? 'Landlord'
      const tenantName = tenant?.name ?? 'Tenant'

      // Email landlord
      if (landlord?.email) {
        await sendEmail({
          to: landlord.email,
          subject: `Tenancy agreement fully signed — ${propertyAddress}`,
          html: contractFullySignedLandlordHtml({
            landlordName,
            tenantName,
            propertyAddress,
            dashboardUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/properties/${contract.tenancy.propertyId}`,
          }),
        })
      }

      // Email tenant
      if (tenant?.email) {
        await sendEmail({
          to: tenant.email,
          subject: `Tenancy agreement fully signed — ${propertyAddress}`,
          html: contractFullySignedTenantHtml({
            tenantName,
            landlordName,
            propertyAddress,
          }),
        })
      }
    }

    // Fire and forget — update landlord's MailerLite subscriber
    if (newStatus === 'BOTH_SIGNED' && contract.tenancy.property.user?.email) {
      updateSubscriber(contract.tenancy.property.user.email, { has_signed_contract: 1 })
        .catch((err) => console.error('[MailerLite]', err))
    }

    // Fire-and-forget PDF regeneration when both parties have signed
    if (newStatus === 'BOTH_SIGNED') {
      const tenancyId = contract.tenancyId
      void (async () => {
        try {
          const pdfBuffer = await buildAptContractPDF(tenancyId)
          const storagePath = await uploadFile('documents', `contracts/${tenancyId}/contract.pdf`, pdfBuffer)
          await prisma.tenancyContract.update({
            where: { id: contract.id },
            data: { pdfUrl: storagePath },
          })
          console.log('[contracts/sign] PDF regenerated with signatures for', tenancyId)
        } catch (err) {
          console.error('[contracts/sign] PDF regeneration failed:', err)
        }
      })()
    }

    return NextResponse.json({
      data: {
        ...updated,
        message: newStatus === 'BOTH_SIGNED'
          ? 'Contract fully signed! Both parties have been notified.'
          : `Signed successfully as ${role}. Waiting for the other party.`,
      },
    })
  } catch (err) {
    console.error('[contracts/[token]/sign POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
