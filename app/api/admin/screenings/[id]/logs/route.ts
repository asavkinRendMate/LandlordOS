import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authError = await verifyAdminSession()
  if (authError) return authError

  try {
    const logs = await prisma.screeningLog.findMany({
      where: { screeningReportId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      data: logs.map((l) => ({
        id: l.id,
        stage: l.stage,
        level: l.level,
        message: l.message,
        data: l.data,
        createdAt: l.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Admin: failed to list screening logs', error)
    return NextResponse.json({ error: 'Failed to list logs' }, { status: 500 })
  }
}
