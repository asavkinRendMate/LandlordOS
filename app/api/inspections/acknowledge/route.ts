import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/** POST — tenant acknowledges inspection notice (no auth required — token-based) */
export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token?: string }
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const inspection = await prisma.propertyInspection.findFirst({
      where: { token, noticeSeenAt: null },
    })
    if (!inspection) return NextResponse.json({ error: 'Not found or already acknowledged' }, { status: 404 })

    await prisma.propertyInspection.update({
      where: { id: inspection.id },
      data: { noticeSeenAt: new Date() },
    })

    return NextResponse.json({ data: { acknowledged: true } })
  } catch (err) {
    console.error('[inspections/acknowledge POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
