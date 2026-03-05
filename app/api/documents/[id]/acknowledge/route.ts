import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find document
    const doc = await prisma.propertyDocument.findUnique({ where: { id: params.id } })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Verify requester is a tenant of this property
    const tenant = await prisma.tenant.findFirst({
      where: {
        propertyId: doc.propertyId,
        userId: user.id,
        status: { in: ['TENANT', 'INVITED'] },
      },
    })
    if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const ack = await prisma.documentAcknowledgment.upsert({
      where: { documentId_tenantId: { documentId: params.id, tenantId: tenant.id } },
      create: { documentId: params.id, tenantId: tenant.id },
      update: {},
    })

    return NextResponse.json({ data: { acknowledgedAt: ack.acknowledgedAt } })
  } catch (err) {
    console.error('[documents/[id]/acknowledge POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
