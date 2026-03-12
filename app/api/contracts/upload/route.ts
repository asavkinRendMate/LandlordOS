import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'
import { buildCoverSheetPDF } from '@/lib/pdf-mappers'
import { sendEmail } from '@/lib/resend'
import { contractSigningHtml } from '@/lib/email-templates/contract'
import { env } from '@/lib/env'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const tenancyId = formData.get('tenancyId') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!tenancyId) return NextResponse.json({ error: 'Missing tenancyId' }, { status: 400 })
    if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Only PDF files accepted' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })

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

    const supabaseAdmin = createServerClient()
    const { error: bucketError } = await supabaseAdmin.storage.getBucket('documents')
    if (bucketError) await supabaseAdmin.storage.createBucket('documents', { public: false })

    // Upload original
    const arrayBuffer = await file.arrayBuffer()
    const uploadedBuffer = Buffer.from(arrayBuffer)

    const originalPath = `contracts/${tenancyId}/original.pdf`
    await supabaseAdmin.storage.from('documents').upload(originalPath, uploadedBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

    // Generate cover sheet + merge
    const combinedBuffer = await buildCoverSheetPDF(tenancyId, uploadedBuffer)

    // Upload combined
    const storagePath = `contracts/${tenancyId}/contract.pdf`
    await supabaseAdmin.storage.from('documents').upload(storagePath, combinedBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

    // Create contract record
    const contract = await prisma.tenancyContract.create({
      data: {
        tenancyId,
        type: 'UPLOADED',
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
    console.error('[contracts/upload POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
