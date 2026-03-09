import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'
import { deleteFile } from '@/lib/storage'

export async function GET() {
  const authError = await verifyAdminSession()
  if (authError) return authError

  try {
    const reports = await prisma.financialReport.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        totalScore: true,
        grade: true,
        applicantName: true,
        statementFiles: true,
        createdAt: true,
        tenant: { select: { email: true, name: true } },
        property: { select: { line1: true, city: true, postcode: true } },
        invite: { select: { candidateEmail: true, candidateName: true, propertyAddress: true } },
      },
    })

    const data = reports.map((r) => {
      const email = r.invite?.candidateEmail ?? r.tenant?.email ?? null
      const name = r.applicantName ?? r.invite?.candidateName ?? r.tenant?.name ?? null
      const address = r.property
        ? [r.property.line1, r.property.city, r.property.postcode].filter(Boolean).join(', ')
        : r.invite?.propertyAddress ?? null
      const files = Array.isArray(r.statementFiles) ? r.statementFiles : []

      return {
        id: r.id,
        status: r.status,
        totalScore: r.totalScore,
        grade: r.grade,
        applicantEmail: email,
        applicantName: name,
        propertyAddress: address,
        fileCount: files.length,
        createdAt: r.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Admin: failed to fetch screenings', error)
    return NextResponse.json({ error: 'Failed to fetch screenings' }, { status: 500 })
  }
}

const deleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

export async function DELETE(req: Request) {
  const authError = await verifyAdminSession()
  if (authError) return authError

  try {
    const body: unknown = await req.json()
    const result = deleteSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { ids } = result.data
    let deleted = 0
    let failed = 0

    for (const id of ids) {
      try {
        const report = await prisma.financialReport.findUnique({
          where: { id },
          select: { statementFiles: true, inviteId: true },
        })
        if (!report) {
          failed++
          continue
        }

        // Delete storage files (best-effort)
        if (report.statementFiles && Array.isArray(report.statementFiles)) {
          for (const file of report.statementFiles) {
            const f = file as { storagePath?: string }
            if (f.storagePath) {
              try {
                await deleteFile(f.storagePath, 'bank-statements')
              } catch {
                // Storage cleanup is best-effort
              }
            }
          }
        }

        // Delete the report
        await prisma.financialReport.delete({ where: { id } })
        deleted++
      } catch (err) {
        console.error(`Admin: failed to delete screening ${id}`, err)
        failed++
      }
    }

    return NextResponse.json({ data: { deleted, failed } })
  } catch (error) {
    console.error('Admin: failed to bulk delete screenings', error)
    return NextResponse.json({ error: 'Failed to delete screenings' }, { status: 500 })
  }
}
