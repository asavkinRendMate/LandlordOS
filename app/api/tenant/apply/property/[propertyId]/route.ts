import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public route — no auth required, returns only public-facing property data

export async function GET(_req: Request, { params }: { params: { propertyId: string } }) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.propertyId },
      select: { id: true, name: true, line1: true, line2: true, city: true, postcode: true, requireFinancialVerification: true },
    })

    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: property })
  } catch (err) {
    console.error('[tenant/apply/property GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
