import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCheckInPhotoUrl } from '@/lib/check-in-storage'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const report = await prisma.checkInReport.findUnique({
      where: { token: params.token },
      include: {
        property: { select: { line1: true, line2: true, city: true, postcode: true, name: true } },
        tenant: { select: { id: true, name: true, email: true } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Get landlord name
    const property = await prisma.property.findUnique({
      where: { id: report.propertyId },
      include: { user: { select: { name: true, email: true } } },
    })
    const landlordName = property?.user?.name ?? property?.user?.email ?? 'Your landlord'

    const photosWithUrls = await Promise.all(
      report.photos.map(async (photo) => ({
        ...photo,
        signedUrl: await getCheckInPhotoUrl(photo.fileUrl).catch(() => null),
      })),
    )

    return NextResponse.json({
      data: {
        id: report.id,
        status: report.status,
        token: report.token,
        landlordName,
        tenantConfirmedAt: report.tenantConfirmedAt,
        landlordConfirmedAt: report.landlordConfirmedAt,
        createdAt: report.createdAt,
        property: report.property,
        tenant: report.tenant,
        photos: photosWithUrls,
      },
    })
  } catch (err) {
    console.error('[check-in/token/[token] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
