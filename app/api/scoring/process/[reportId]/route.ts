import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeStatement } from '@/lib/scoring'

// Allow up to 60s for AI analysis of multiple bank statements
export const maxDuration = 60

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params

    const report = await prisma.financialReport.findUnique({
      where: { id: reportId },
      select: { id: true, status: true },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.status !== 'PENDING') {
      return NextResponse.json({ error: 'Report already processed' }, { status: 409 })
    }

    console.log(`[scoring/process] Starting analysis for reportId=${reportId}`)

    // Run analysis — this is the long-running operation that needs the extended timeout
    await analyzeStatement(reportId)

    return NextResponse.json({ data: { reportId, status: 'COMPLETED' } })
  } catch (err) {
    console.error(`[scoring/process] Analysis failed:`, err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
