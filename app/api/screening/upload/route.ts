import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createAuthClient } from '@/lib/supabase/auth'
import { uploadFile } from '@/lib/storage'
import { analyzeStatement } from '@/lib/scoring'

const BUCKET = 'bank-statements'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB per file
const MAX_TOTAL_SIZE = 10 * 1024 * 1024 // 10 MB total
const MAX_FILES = 5

interface StatementFile {
  index: number
  fileName: string
  storagePath: string
  fileSize: number
  verificationStatus: 'PENDING' | 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN'
  detectedName?: string | null
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  reason?: string
  relationship?: string | null
  removedByApplicant?: boolean
}

export async function POST(req: Request) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const formData = await req.formData()
    const files = formData.getAll('file') as File[]
    const candidateName = formData.get('candidateName') as string | null
    const monthlyRent = formData.get('monthlyRent') as string | null
    const declaredIncome = formData.get('declaredIncome') as string | null

    // Validate inputs
    if (!candidateName?.trim()) {
      return NextResponse.json({ error: 'Candidate name is required' }, { status: 400 })
    }
    if (!monthlyRent || isNaN(Number(monthlyRent)) || Number(monthlyRent) <= 0) {
      return NextResponse.json({ error: 'Valid monthly rent is required' }, { status: 400 })
    }
    const monthlyRentPence = Math.round(Number(monthlyRent) * 100)

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

    // Find a package with remaining credits (FIFO — oldest first)
    const allPackages = await prisma.screeningPackage.findMany({
      where: {
        userId: user.id,
        paymentStatus: { in: ['MOCK_PAID', 'PAID'] },
      },
      orderBy: { createdAt: 'asc' },
    })
    const packageToUse = allPackages.find((p) => p.usedCredits < p.totalCredits) ?? null

    if (!packageToUse) {
      return NextResponse.json({ error: 'No screening credits remaining. Please purchase a pack.' }, { status: 402 })
    }

    // Fetch active config
    const config = await prisma.scoringConfig.findFirst({ where: { isActive: true } })
    if (!config) {
      return NextResponse.json({ error: 'Scoring service is not configured' }, { status: 503 })
    }

    // Create usage + report + deduct credit in a transaction
    const { report, usage } = await prisma.$transaction(async (tx) => {
      // Deduct credit
      const updated = await tx.screeningPackage.update({
        where: { id: packageToUse!.id },
        data: { usedCredits: { increment: 1 } },
      })
      if (updated.usedCredits > updated.totalCredits) {
        throw new Error('Credit already used — race condition')
      }

      // Create usage record
      const usage = await tx.screeningPackageUsage.create({
        data: {
          packageId: packageToUse!.id,
          candidateName: candidateName.trim(),
          monthlyRentPence,
        },
      })

      // Create financial report linked to usage
      const report = await tx.financialReport.create({
        data: {
          reportType: 'LANDLORD_REQUESTED',
          status: 'PENDING',
          scoringConfigVersion: config.version,
          applicantName: candidateName.trim(),
          declaredIncomePence: declaredIncome ? Math.round(Number(declaredIncome) * 100) : null,
          screeningUsageId: usage.id,
        },
      })

      return { report, usage }
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
      console.error(`[screening/upload] background analysis failed for ${report.id}:`, err),
    )

    return NextResponse.json({
      data: {
        reportId: report.id,
        usageId: usage.id,
        status: 'PROCESSING',
        fileCount: files.length,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[screening/upload POST]', err)
    if (err instanceof Error && err.message.includes('race condition')) {
      return NextResponse.json({ error: 'Credit conflict — please try again' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
