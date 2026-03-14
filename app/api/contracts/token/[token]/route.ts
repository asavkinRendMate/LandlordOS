import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const { token } = params

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
            property: { select: { line1: true, line2: true, city: true, postcode: true, name: true } },
            tenant: { select: { name: true } },
          },
        },
      },
    })

    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    // Determine role
    const isLandlord = contract.landlordToken === token
    const role = isLandlord ? 'landlord' : 'tenant'

    // Get landlord name
    const property = await prisma.property.findUnique({
      where: { id: contract.tenancy.propertyId },
      include: { user: { select: { name: true, email: true } } },
    })
    const landlordName = property?.user?.name ?? property?.user?.email ?? 'Landlord'

    return NextResponse.json({
      data: {
        id: contract.id,
        status: contract.status,
        type: contract.type,
        role,
        landlordName,
        tenantName: contract.tenancy.tenant?.name ?? 'Tenant',
        landlordSignedAt: contract.landlordSignedAt,
        landlordSignedName: contract.landlordSignedName,
        tenantSignedAt: contract.tenantSignedAt,
        tenantSignedName: contract.tenantSignedName,
        pdfUrl: !!contract.pdfUrl,
        property: contract.tenancy.property,
        createdAt: contract.createdAt,
      },
    })
  } catch (err) {
    console.error('[contracts/token/[token] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
