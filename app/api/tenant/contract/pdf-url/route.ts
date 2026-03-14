import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find the tenant's active tenancy and its contract
    const tenant = await prisma.tenant.findFirst({
      where: {
        email: user.email!,
        status: { in: ['TENANT', 'INVITED'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const tenancy = await prisma.tenancy.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      include: {
        contract: { select: { pdfUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!tenancy?.contract?.pdfUrl) {
      return NextResponse.json({ error: 'PDF not yet generated' }, { status: 404 })
    }

    const server = createServerClient()
    const { data, error } = await server.storage.from('documents').createSignedUrl(tenancy.contract.pdfUrl, 3600)
    if (error || !data) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (err) {
    console.error('[tenant/contract/pdf-url GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
