import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'
import { getSignedUrl } from '@/lib/storage'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authError = await verifyAdminSession()
  if (authError) return authError

  try {
    const report = await prisma.financialReport.findUnique({
      where: { id: params.id },
      select: { statementFiles: true },
    })

    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const rawFiles = Array.isArray(report.statementFiles) ? report.statementFiles : []
    const files: Array<{
      fileName: string
      fileSize: number | null
      storagePath: string
      downloadUrl: string | null
    }> = []

    for (const file of rawFiles) {
      const f = file as { fileName?: string; fileSize?: number; storagePath?: string }
      if (!f.storagePath) continue

      let downloadUrl: string | null = null
      try {
        downloadUrl = await getSignedUrl(f.storagePath, 3600, 'bank-statements')
      } catch {
        // File may have been deleted from storage
      }

      files.push({
        fileName: f.fileName ?? f.storagePath.split('/').pop() ?? 'unknown',
        fileSize: f.fileSize ?? null,
        storagePath: f.storagePath,
        downloadUrl,
      })
    }

    return NextResponse.json({ data: files })
  } catch (error) {
    console.error('Admin: failed to list screening files', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}
