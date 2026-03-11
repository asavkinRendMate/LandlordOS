import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { getUnlockPrice } from '@/lib/screening-unlock'

export async function GET(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const reportId = searchParams.get('reportId')
    if (!reportId) {
      return NextResponse.json({ error: 'reportId required' }, { status: 400 })
    }

    const report = await prisma.financialReport.findFirst({
      where: {
        id: reportId,
        status: 'COMPLETED',
        OR: [
          { property: { userId: user.id } },
          { invite: { landlordId: user.id } },
        ],
      },
      select: { id: true, propertyId: true, isLocked: true, status: true },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const result = await getUnlockPrice(user.id, report)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[payment/unlock-price GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
