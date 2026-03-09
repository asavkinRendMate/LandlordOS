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
    const report = await prisma.financialReport.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        totalScore: true,
        grade: true,
        aiSummary: true,
        applicantName: true,
        statementFiles: true,
        breakdown: true,
        appliedRules: true,
        failureReason: true,
        createdAt: true,
        tenant: { select: { email: true, name: true } },
        property: { select: { line1: true, city: true, postcode: true } },
        invite: { select: { candidateEmail: true, candidateName: true, propertyAddress: true } },
      },
    })

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const email = report.invite?.candidateEmail ?? report.tenant?.email ?? null
    const name = report.applicantName ?? report.invite?.candidateName ?? report.tenant?.name ?? null
    const address = report.property
      ? [report.property.line1, report.property.city, report.property.postcode].filter(Boolean).join(', ')
      : report.invite?.propertyAddress ?? null

    return NextResponse.json({
      data: {
        id: report.id,
        status: report.status,
        totalScore: report.totalScore,
        grade: report.grade,
        aiSummary: report.aiSummary,
        applicantEmail: email,
        applicantName: name,
        propertyAddress: address,
        breakdown: report.breakdown,
        appliedRules: report.appliedRules,
        failureReason: report.failureReason,
        statementFiles: report.statementFiles,
        createdAt: report.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Admin: failed to fetch screening detail', error)
    return NextResponse.json({ error: 'Failed to fetch screening' }, { status: 500 })
  }
}
