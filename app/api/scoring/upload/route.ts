import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'
import { analyzeStatement } from '@/lib/scoring'

const BUCKET = 'bank-statements'
const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const file = formData.get('file') as File | null
    const propertyId = formData.get('propertyId') as string | null
    const tenantId = formData.get('tenantId') as string | null
    const reportType = formData.get('reportType') as string | null

    // Validate file
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 400 })
    }

    if (!reportType || !['LANDLORD_REQUESTED', 'SELF_REQUESTED'].includes(reportType)) {
      return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 })
    }

    // Fetch active config version
    const config = await prisma.scoringConfig.findFirst({ where: { isActive: true } })
    if (!config) {
      return NextResponse.json({ error: 'Scoring service is not configured' }, { status: 503 })
    }

    // Create FinancialReport record first to get the ID for the storage path
    const report = await prisma.financialReport.create({
      data: {
        tenantId: tenantId ?? null,
        propertyId: propertyId ?? null,
        reportType: reportType as 'LANDLORD_REQUESTED' | 'SELF_REQUESTED',
        status: 'PENDING',
        scoringConfigVersion: config.version,
      },
    })

    // Upload to Supabase Storage: /{reportId}/{fileName}
    const storagePath = `${report.id}/${file.name}`
    await uploadFile(storagePath, file, BUCKET)

    // Save file URL on report
    await prisma.financialReport.update({
      where: { id: report.id },
      data: { statementFileUrl: storagePath },
    })

    // Trigger scoring in the background — do NOT await
    analyzeStatement(report.id).catch((err) =>
      console.error(`[scoring/upload] background analysis failed for ${report.id}:`, err),
    )

    return NextResponse.json({ data: { reportId: report.id, status: 'PROCESSING' } }, { status: 201 })
  } catch (err) {
    console.error('[scoring/upload POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
