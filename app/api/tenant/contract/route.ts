import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
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
      return NextResponse.json({ data: { status: null } })
    }

    const tenancy = await prisma.tenancy.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      include: {
        contract: {
          select: {
            status: true,
            type: true,
            tenantSignedAt: true,
            landlordSignedAt: true,
            tenantToken: true,
            pdfUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!tenancy?.contract) {
      return NextResponse.json({ data: { status: null } })
    }

    const c = tenancy.contract
    return NextResponse.json({
      data: {
        status: c.status,
        contractType: c.type,
        tenantSignedAt: c.tenantSignedAt?.toISOString() ?? null,
        landlordSignedAt: c.landlordSignedAt?.toISOString() ?? null,
        signingToken: c.tenantToken,
        hasPdf: !!c.pdfUrl,
      },
    })
  } catch (err) {
    console.error('[tenant/contract GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
