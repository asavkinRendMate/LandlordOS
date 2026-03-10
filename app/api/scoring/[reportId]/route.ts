import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeStatement } from '@/lib/scoring'
import { createAuthClient } from '@/lib/supabase/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

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
        hasUnverifiedFiles: true,
        statementFiles: true,
        verificationWarning: true,
        applicantName: true,
        jointApplicants: true,
        validationResults: true,
        failureReason: true,
        isLocked: true,
        monthlyRentPence: true,
        createdAt: true,
        updatedAt: true,
        property: { select: { userId: true, line1: true, line2: true, city: true, postcode: true } },
        tenant: { select: { name: true, email: true } },
      },
    })

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    // Verify the logged-in user owns the property this report belongs to
    if (report.property?.userId !== user.id) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

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
