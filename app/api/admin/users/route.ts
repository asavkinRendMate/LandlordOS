import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function GET() {
  const authError = await verifyAdminSession()
  if (authError) return authError

  try {
    const users = await prisma.user.findMany({
      include: {
        properties: { select: { id: true } },
        tenantProfiles: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = users.map((user) => {
      const hasProperties = user.properties.length > 0
      const isTenant = user.tenantProfiles.some((t) => t.status === 'TENANT')
      let role: 'Landlord' | 'Tenant' | 'Both' | 'Unknown' = 'Unknown'
      if (hasProperties && isTenant) role = 'Both'
      else if (hasProperties) role = 'Landlord'
      else if (isTenant) role = 'Tenant'

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
        propertiesCount: user.properties.length,
        tenantProfilesCount: user.tenantProfiles.length,
        createdAt: user.createdAt,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin: failed to fetch users', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
