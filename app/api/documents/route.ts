import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

// GET /api/documents?propertyId=xxx — list documents for a property (landlord or tenant)
export async function GET(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const propertyId = searchParams.get('propertyId')
    if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 })

    // Determine if landlord or tenant
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })
    const isOwner = !!property

    if (!isOwner) {
      const tenant = await prisma.tenant.findFirst({
        where: { propertyId, userId: user.id, status: { in: ['TENANT', 'INVITED'] } },
      })
      if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const documents = await prisma.propertyDocument.findMany({
      where: { propertyId },
      include: {
        acknowledgments: {
          include: { tenant: { select: { name: true } } },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ data: documents })
  } catch (err) {
    console.error('[documents GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
