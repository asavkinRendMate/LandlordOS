import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const property = await prisma.property.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        complianceDocs: true,
        tenancies: {
          where: { status: { not: 'ENDED' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tenants: {
          orderBy: { createdAt: 'desc' },
          include: {
            documents: {
              select: { documentType: true, expiryDate: true },
            },
          },
        },
      },
    })

    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: property })
  } catch (err) {
    console.error('[properties/[id] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
