import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'

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

const declarationSchema = z.object({
  declarations: z.array(
    z.object({
      index: z.number(),
      relationship: z.string().min(1),
      customRelationship: z.string().optional(),
    }),
  ).optional(),
  verifiedInPerson: z.literal(true).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params
    const body: unknown = await req.json()
    const parsed = declarationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const report = await prisma.financialReport.findUnique({
      where: { id: reportId },
      include: { property: true },
    })
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const { declarations, verifiedInPerson } = parsed.data

    // ── Mode B: Landlord "verified in person" ────────────────────────────────
    if (verifiedInPerson) {
      const supabase = createAuthClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Verify landlord owns the property
      if (!report.propertyId) {
        return NextResponse.json({ error: 'Report has no linked property' }, { status: 400 })
      }

      const property = await prisma.property.findFirst({
        where: { id: report.propertyId, userId: user.id },
      })
      if (!property) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      await prisma.financialReport.update({
        where: { id: reportId },
        data: {
          hasUnverifiedFiles: false,
          verificationWarning: null,
        },
      })

      return NextResponse.json({ data: { success: true } })
    }

    // ── Mode A: Applicant declarations (public flow) ─────────────────────────
    if (declarations && declarations.length > 0) {
      const statementFiles = report.statementFiles as StatementFile[] | null
      if (!statementFiles) {
        return NextResponse.json({ error: 'No statement files on report' }, { status: 400 })
      }

      let hasRemovals = false

      for (const decl of declarations) {
        const fileIdx = statementFiles.findIndex((f) => f.index === decl.index)
        if (fileIdx < 0) continue

        if (decl.relationship === 'REMOVE') {
          statementFiles[fileIdx].removedByApplicant = true
          hasRemovals = true
        } else {
          statementFiles[fileIdx].relationship = decl.customRelationship ?? decl.relationship
        }
      }

      // Rebuild jointApplicants from non-removed unverified files
      const unverifiedFiles = statementFiles.filter(
        (f) => !f.removedByApplicant && f.verificationStatus === 'UNVERIFIED' && f.relationship,
      )
      const jointApplicants = unverifiedFiles.length > 0
        ? unverifiedFiles.map((f) => ({
            name: f.detectedName ?? 'Unknown',
            verificationStatus: f.verificationStatus,
            income: null,
            fileIndices: [f.index],
            relationship: f.relationship,
          }))
        : null

      // Recalculate hasUnverifiedFiles
      const hasUnverified = statementFiles.some(
        (f) => !f.removedByApplicant && f.verificationStatus === 'UNVERIFIED',
      )

      await prisma.financialReport.update({
        where: { id: reportId },
        data: {
          statementFiles: statementFiles as unknown as Prisma.InputJsonValue,
          jointApplicants: jointApplicants
            ? (jointApplicants as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          hasUnverifiedFiles: hasUnverified,
        },
      })

      // If files were removed, re-trigger analysis
      if (hasRemovals) {
        const { analyzeStatement } = await import('@/lib/scoring')
        analyzeStatement(reportId).catch((err) =>
          console.error(`[declarations] re-analysis failed for ${reportId}:`, err),
        )
        return NextResponse.json({ data: { success: true, reanalyzing: true } })
      }

      return NextResponse.json({ data: { success: true } })
    }

    return NextResponse.json({ error: 'No declarations or verification provided' }, { status: 400 })
  } catch (err) {
    console.error('[scoring/[reportId]/declarations PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
