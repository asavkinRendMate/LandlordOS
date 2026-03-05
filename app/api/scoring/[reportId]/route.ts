import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeStatement } from '@/lib/scoring'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params
    const report = await prisma.financialReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        totalScore: true,
        grade: true,
        aiSummary: true,
        breakdown: true,
        appliedRules: true,
        verificationToken: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    return NextResponse.json({ data: report })
  } catch (err) {
    console.error('[scoring/[reportId] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST: manually re-trigger analysis (admin use)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params
    const report = await prisma.financialReport.findUnique({ where: { id: reportId } })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    analyzeStatement(reportId).catch((err) =>
      console.error(`[scoring/[reportId] POST] re-analysis failed for ${reportId}:`, err),
    )

    return NextResponse.json({ data: { reportId, status: 'PROCESSING' } })
  } catch (err) {
    console.error('[scoring/[reportId] POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
