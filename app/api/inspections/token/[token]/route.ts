import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getInspectionPhotoUrl } from '@/lib/inspection-storage'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const inspection = await prisma.propertyInspection.findUnique({
      where: { token: params.token },
      include: {
        property: { select: { line1: true, line2: true, city: true, postcode: true, name: true } },
        tenant: { select: { id: true, name: true, email: true } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Get landlord name
    const property = await prisma.property.findUnique({
      where: { id: inspection.propertyId },
      include: { user: { select: { name: true, email: true } } },
    })
    const landlordName = property?.user?.name ?? property?.user?.email ?? 'Your landlord'

    const photosWithUrls = await Promise.all(
      inspection.photos.map(async (photo) => ({
        ...photo,
        signedUrl: await getInspectionPhotoUrl(photo.fileUrl).catch(() => null),
      })),
    )

    return NextResponse.json({
      data: {
        id: inspection.id,
        status: inspection.status,
        token: inspection.token,
        landlordName,
        tenantConfirmedAt: inspection.tenantConfirmedAt,
        landlordConfirmedAt: inspection.landlordConfirmedAt,
        createdAt: inspection.createdAt,
        property: inspection.property,
        tenant: inspection.tenant,
        photos: photosWithUrls,
      },
    })
  } catch (err) {
    console.error('[inspections/token/[token] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
