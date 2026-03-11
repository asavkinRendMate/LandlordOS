import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeStatement } from '@/lib/scoring'
import { createAuthClient } from '@/lib/supabase/auth'

const FULL_SELECT = {
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
  invite: { select: { landlordId: true } },
} as const

const POLLING_SELECT = {
  id: true,
  status: true,
  totalScore: true,
  grade: true,
  verificationToken: true,
  hasUnverifiedFiles: true,
  statementFiles: true,
  applicantName: true,
  failureReason: true,
} as const

/** Look up report by ID, falling back to inviteId if no direct match */
async function findReport<T extends Record<string, unknown>>(
  reportId: string,
  select: T,
) {
  // Try direct report ID first
  const report = await prisma.financialReport.findUnique({
    where: { id: reportId },
    select,
  })
  if (report) return report

  // Fallback: reportId may be an invite ID (legacy links)
  return prisma.financialReport.findFirst({
    where: { inviteId: reportId },
    orderBy: { createdAt: 'desc' },
    select,
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params

    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()

    // ── Unauthenticated: return status + score fields for candidate polling ──
    if (!user) {
      const report = await findReport(reportId, POLLING_SELECT)
      if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      return NextResponse.json({ data: report })
    }

    // ── Authenticated: return full report if user owns the property ─────────
    const report = await findReport(reportId, FULL_SELECT)

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    // Verify the logged-in user owns this report (via property or invite)
    const ownsViaProperty = report.property?.userId === user.id
    const ownsViaInvite = report.invite?.landlordId === user.id
    if (!ownsViaProperty && !ownsViaInvite) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { invite, ...reportData } = report
    return NextResponse.json({ data: reportData })
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
