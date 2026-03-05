import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function GET() {
  const authError = await verifyAdminSession()
  if (authError) return authError

  try {
    const properties = await prisma.property.findMany({
      include: {
        user: { select: { email: true } },
        tenants: {
          where: { status: 'TENANT' },
          select: { name: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = properties.map((p) => ({
      id: p.id,
      name: p.name,
      line1: p.line1,
      line2: p.line2,
      city: p.city,
      postcode: p.postcode,
      status: p.status,
      ownerEmail: p.user.email,
      tenantName: p.tenants[0]?.name ?? null,
      createdAt: p.createdAt,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin: failed to fetch properties', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}
