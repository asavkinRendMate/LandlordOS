import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { analyzeStatement } from '@/lib/scoring'

const BUCKET = 'bank-statements'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_TOTAL_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

interface StatementFile {
  index: number
  fileName: string
  storagePath: string
  fileSize: number
  verificationStatus: 'PENDING' | 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN'
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } },
) {
  try {
    const { token } = params

    const invite = await prisma.screeningInvite.findUnique({ where: { token } })
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check expiry
    const now = new Date()
    if (invite.status === 'PENDING' && (now.getTime() - invite.createdAt.getTime()) > SEVEN_DAYS_MS) {
      await prisma.screeningInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED', updatedAt: now },
      })
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
    }

    // Check if already completed or has a processing report
    if (invite.status === 'COMPLETED' || invite.status === 'PAID') {
      const existingReport = await prisma.financialReport.findFirst({
        where: { inviteId: invite.id, status: { in: ['COMPLETED', 'PROCESSING'] } },
      })
      if (existingReport) {
        return NextResponse.json({
          error: 'A report has already been submitted for this invite',
          data: { reportId: existingReport.id, status: existingReport.status },
        }, { status: 409 })
      }
    }

    const formData = await req.formData()
    const files = formData.getAll('file') as File[]
    const declaredIncome = formData.get('declaredIncome') as string | null

    // Validate files
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 })
    }

    let totalSize = 0
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: `Only PDF files are accepted: ${file.name}` }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File exceeds 10 MB limit: ${file.name}` }, { status: 400 })
      }
      totalSize += file.size
    }
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json({ error: 'Total file size exceeds 10 MB limit' }, { status: 400 })
    }

    // Fetch active config
    const config = await prisma.scoringConfig.findFirst({ where: { isActive: true } })
    if (!config) {
      return NextResponse.json({ error: 'Scoring service is not configured' }, { status: 503 })
    }

    // Mark invite as started if still pending
    if (invite.status === 'PENDING' || invite.status === 'STARTED') {
      await prisma.screeningInvite.update({
        where: { id: invite.id },
        data: { status: 'STARTED', updatedAt: now },
      })
    }

    // Create report
    const report = await prisma.financialReport.create({
      data: {
        reportType: 'LANDLORD_REQUESTED',
        status: 'PENDING',
        scoringConfigVersion: config.version,
        applicantName: invite.candidateName,
        inviteId: invite.id,
        isLocked: true,
        monthlyRentPence: invite.monthlyRentPence,
        declaredIncomePence: declaredIncome ? Math.round(Number(declaredIncome) * 100) : null,
      },
    })

    // Upload files
    const statementFiles: StatementFile[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const storagePath = `${report.id}/${i}-${file.name}`
      await uploadFile(storagePath, file, BUCKET)
      statementFiles.push({
        index: i,
        fileName: file.name,
        storagePath,
        fileSize: file.size,
        verificationStatus: 'PENDING',
      })
    }

    // Save statementFiles
    await prisma.financialReport.update({
      where: { id: report.id },
      data: { statementFiles: statementFiles as unknown as Prisma.InputJsonValue },
    })

    // Trigger analysis in background
    analyzeStatement(report.id).catch((err) =>
      console.error(`[screening/invite/submit] background analysis failed for ${report.id}:`, err),
    )

    return NextResponse.json({
      data: {
        reportId: report.id,
        status: 'PROCESSING',
        fileCount: files.length,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[screening/invite/[token]/submit POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
