import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'

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
    console.log(`[screening] ── SCORING UPLOAD ─────────────────────`)

    const formData = await req.formData()

    const files = formData.getAll('file') as File[]
    const propertyId = formData.get('propertyId') as string | null
    const tenantId = formData.get('tenantId') as string | null
    const reportType = formData.get('reportType') as string | null
    const applicantName = formData.get('applicantName') as string | null
    const declaredIncome = formData.get('declaredIncome') as string | null

    console.log(`[screening] applicantName="${applicantName}", reportType=${reportType}, propertyId=${propertyId}, tenantId=${tenantId}`)
    console.log(`[screening:pdf] Files received: ${files.length}`)
    for (let i = 0; i < files.length; i++) {
      console.log(`[screening:pdf] File ${i + 1}: ${files[i].name} ${(files[i].size / 1024).toFixed(0)}KB ${files[i].type}`)
    }
    if (declaredIncome) {
      console.log(`[screening] Declared income: £${declaredIncome}`)
    }

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

    if (!reportType || !['LANDLORD_REQUESTED', 'SELF_REQUESTED'].includes(reportType)) {
      return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 })
    }

    // Fetch active config version
    const config = await prisma.scoringConfig.findFirst({ where: { isActive: true } })
    if (!config) {
      return NextResponse.json({ error: 'Scoring service is not configured' }, { status: 503 })
    }

    // Create FinancialReport record first to get the ID for storage paths
    const report = await prisma.financialReport.create({
      data: {
        tenantId: tenantId ?? null,
        propertyId: propertyId ?? null,
        reportType: reportType as 'LANDLORD_REQUESTED' | 'SELF_REQUESTED',
        status: 'PENDING',
        scoringConfigVersion: config.version,
        applicantName: applicantName ?? null,
        declaredIncomePence: declaredIncome ? Math.round(Number(declaredIncome) * 100) : null,
      },
    })

    // Upload each file and build statementFiles array
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

    // Save statementFiles on report
    await prisma.financialReport.update({
      where: { id: report.id },
      data: { statementFiles: statementFiles as unknown as Prisma.InputJsonValue },
    })

    console.log(`[screening:db] Report created: ${report.id}, ${statementFiles.length} files uploaded`)
    console.log(`[screening] Triggering background analysis for reportId=${report.id}`)

    // Fire-and-forget to a dedicated processing route with maxDuration=60
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    fetch(`${baseUrl}/api/scoring/process/${report.id}`, { method: 'POST' }).catch((err) =>
      console.error(`[screening] ❌ Background analysis trigger failed for ${report.id}:`, err),
    )

    return NextResponse.json(
      { data: { reportId: report.id, status: 'PROCESSING', fileCount: files.length } },
      { status: 201 },
    )
  } catch (err) {
    console.error('[scoring/upload POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
