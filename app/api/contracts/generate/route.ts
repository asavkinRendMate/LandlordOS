import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { charge, hasCard } from '@/lib/payment-service'
import { buildAptContractPDF } from '@/lib/pdf-mappers'
import { createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { contractSigningHtml } from '@/lib/email-templates/contract'
import { env } from '@/lib/env'

const schema = z.object({
  tenancyId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { tenancyId } = result.data

    // Verify ownership
    const tenancy = await prisma.tenancy.findFirst({
      where: { id: tenancyId, property: { userId: user.id } },
      include: {
        tenant: { select: { name: true, email: true } },
        property: { select: { line1: true, city: true, postcode: true, user: { select: { name: true, email: true } } } },
        contract: { select: { id: true } },
      },
    })
    if (!tenancy) return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 })
    if (tenancy.contract) return NextResponse.json({ error: 'Contract already exists for this tenancy' }, { status: 409 })
    if (!tenancy.tenant) return NextResponse.json({ error: 'No tenant linked to this tenancy' }, { status: 400 })

    // Check card
    const userHasCard = await hasCard(user.id)
    if (!userHasCard) return NextResponse.json({ error: 'No payment method on file' }, { status: 402 })

    // Charge £9.99
    await charge(user.id, 'APT_CONTRACT', 999, tenancyId)

    // Generate PDF
    const pdfBuffer = await buildAptContractPDF(tenancyId)

    // Upload to storage
    const storagePath = `contracts/${tenancyId}/contract.pdf`
    const supabaseAdmin = createServerClient()
    const { error: bucketError } = await supabaseAdmin.storage.getBucket('documents')
    if (bucketError) await supabaseAdmin.storage.createBucket('documents', { public: false })

    await supabaseAdmin.storage.from('documents').upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

    // Create contract record
    const contract = await prisma.tenancyContract.create({
      data: {
        tenancyId,
        type: 'GENERATED',
        status: 'PENDING_SIGNATURES',
        pdfUrl: storagePath,
      },
    })

    // Send signing email to tenant
    const propertyAddress = `${tenancy.property.line1}, ${tenancy.property.city} ${tenancy.property.postcode}`
    const landlordName = tenancy.property.user?.name ?? tenancy.property.user?.email ?? 'Your landlord'
    const signUrl = `${env.NEXT_PUBLIC_APP_URL}/sign/contract/${contract.tenantToken}`

    await sendEmail({
      to: tenancy.tenant.email,
      subject: `Please sign your tenancy agreement — ${propertyAddress}`,
      html: contractSigningHtml({
        tenantName: tenancy.tenant.name,
        landlordName,
        propertyAddress,
        signUrl,
      }),
    })

    return NextResponse.json({ data: contract })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    if (message === 'No payment method on file') {
      return NextResponse.json({ error: message }, { status: 402 })
    }
    console.error('[contracts/generate POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
