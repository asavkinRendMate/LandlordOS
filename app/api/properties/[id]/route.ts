import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthClient } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const property = await prisma.property.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        complianceDocs: true,
        rooms: { orderBy: { order: 'asc' } },
        applicationInvites: { orderBy: { sentAt: 'desc' } },
        tenancies: {
          where: { status: { not: 'ENDED' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tenants: {
          orderBy: { createdAt: 'desc' },
          include: {
            documents: {
              select: { documentType: true, expiryDate: true },
            },
            financialReports: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                inviteId: true,
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
              },
            },
          },
        },
      },
    })

    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: property })
  } catch (err) {
    console.error('[properties/[id] GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

const patchSchema = z.object({
  requireFinancialVerification: z.boolean().optional(),
  bedrooms: z.number().int().min(1).max(10).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: unknown = await req.json()
    const result = patchSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const property = await prisma.property.findFirst({ where: { id: params.id, userId: user.id } })
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.property.update({
      where: { id: params.id },
      data: result.data,
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[properties/[id] PATCH]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// ── DELETE — cascade delete property + all related data + storage files ───────

interface StatementFile {
  storagePath?: string
}

async function removeStorageFolder(bucket: string, prefix: string) {
  const supabase = createServerClient()
  const { data: files } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (!files?.length) return
  // Supabase list returns files at one level — recurse into folders
  const paths: string[] = []
  for (const f of files) {
    if (f.id) {
      paths.push(`${prefix}/${f.name}`)
    } else {
      // It's a folder — list its contents recursively
      const nested = await listAllFiles(bucket, `${prefix}/${f.name}`)
      paths.push(...nested)
    }
  }
  if (paths.length > 0) {
    await supabase.storage.from(bucket).remove(paths)
  }
}

async function listAllFiles(bucket: string, prefix: string): Promise<string[]> {
  const supabase = createServerClient()
  const { data: files } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  if (!files?.length) return []
  const paths: string[] = []
  for (const f of files) {
    if (f.id) {
      paths.push(`${prefix}/${f.name}`)
    } else {
      const nested = await listAllFiles(bucket, `${prefix}/${f.name}`)
      paths.push(...nested)
    }
  }
  return paths
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const property = await prisma.property.findFirst({
      where: { id: params.id, userId: user.id },
    })
    if (!property) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const propertyId = property.id
    const userId = user.id

    // ── Collect IDs needed for storage cleanup before deletion ──────────

    const maintenanceRequests = await prisma.maintenanceRequest.findMany({
      where: { propertyId },
      select: { id: true, photos: { select: { fileUrl: true } } },
    })
    const maintenancePhotoUrls = maintenanceRequests.flatMap((r) => r.photos.map((p) => p.fileUrl))

    const financialReports = await prisma.financialReport.findMany({
      where: { propertyId },
      select: { id: true, statementFiles: true },
    })
    const bankStatementPaths: string[] = []
    for (const report of financialReports) {
      const files = report.statementFiles as StatementFile[] | null
      if (!files) continue
      for (const f of files) {
        if (f.storagePath) bankStatementPaths.push(f.storagePath)
      }
    }

    const tenantDocuments = await prisma.tenantDocument.findMany({
      where: { tenant: { propertyId } },
      select: { fileUrl: true },
    })
    const tenantDocUrls = tenantDocuments.map((d) => d.fileUrl)

    const propertyDocuments = await prisma.propertyDocument.findMany({
      where: { propertyId },
      select: { fileUrl: true },
    })
    const propertyDocUrls = propertyDocuments.map((d) => d.fileUrl)

    // ── Cascade delete in FK-safe order inside a transaction ────────────

    await prisma.$transaction(async (tx) => {
      // 1. CheckInPhotos (via CheckInReport)
      await tx.checkInPhoto.deleteMany({
        where: { report: { propertyId } },
      })

      // 2. CheckInReports
      await tx.checkInReport.deleteMany({ where: { propertyId } })

      // 3. MaintenancePhotos + StatusHistory (via MaintenanceRequest)
      await tx.maintenancePhoto.deleteMany({
        where: { request: { propertyId } },
      })
      await tx.maintenanceStatusHistory.deleteMany({
        where: { request: { propertyId } },
      })

      // 4. MaintenanceRequests
      await tx.maintenanceRequest.deleteMany({ where: { propertyId } })

      // 5. ScreeningLogs + FinancialReports
      await tx.screeningLog.deleteMany({
        where: { screeningReport: { propertyId } },
      })
      await tx.financialReport.deleteMany({ where: { propertyId } })

      // 6. DocumentAcknowledgments (via PropertyDocument or Tenant)
      await tx.documentAcknowledgment.deleteMany({
        where: { document: { propertyId } },
      })

      // 7. TenantDocuments (via Tenant)
      await tx.tenantDocument.deleteMany({
        where: { tenant: { propertyId } },
      })

      // 8. RentPayments (via Tenancy)
      await tx.rentPayment.deleteMany({
        where: { tenancy: { propertyId } },
      })

      // 9. Tenancies
      await tx.tenancy.deleteMany({ where: { propertyId } })

      // 10. Tenants
      await tx.tenant.deleteMany({ where: { propertyId } })

      // 11. PropertyDocuments
      await tx.propertyDocument.deleteMany({ where: { propertyId } })

      // 12. ComplianceDocs
      await tx.complianceDoc.deleteMany({ where: { propertyId } })

      // 13. PropertyRooms
      await tx.propertyRoom.deleteMany({ where: { propertyId } })

      // 14. ApplicationInvites
      await tx.applicationInvite.deleteMany({ where: { propertyId } })

      // 15. Property itself
      await tx.property.delete({ where: { id: propertyId } })
    })

    // ── Storage cleanup (best-effort, don't fail the request) ───────────

    try {
      const storageOps: Promise<void>[] = []

      // documents bucket: {userId}/{propertyId}/...
      storageOps.push(removeStorageFolder('documents', `${userId}/${propertyId}`))

      // check-in-photos bucket: {propertyId}/...
      storageOps.push(removeStorageFolder('check-in-photos', propertyId))

      // tenant-documents bucket: {propertyId}/...
      storageOps.push(removeStorageFolder('tenant-documents', propertyId))

      // maintenance-photos: individual file paths
      if (maintenancePhotoUrls.length > 0) {
        const supa = createServerClient()
        storageOps.push(
          supa.storage.from('maintenance-photos').remove(maintenancePhotoUrls).then(() => undefined),
        )
      }

      // bank-statements: individual file paths
      if (bankStatementPaths.length > 0) {
        const supa = createServerClient()
        storageOps.push(
          supa.storage.from('bank-statements').remove(bankStatementPaths).then(() => undefined),
        )
      }

      // property document file paths (in case folder cleanup misses any)
      if (propertyDocUrls.length > 0) {
        const supa = createServerClient()
        storageOps.push(
          supa.storage.from('documents').remove(propertyDocUrls).then(() => undefined),
        )
      }

      // tenant document file paths
      if (tenantDocUrls.length > 0) {
        const supa = createServerClient()
        storageOps.push(
          supa.storage.from('tenant-documents').remove(tenantDocUrls).then(() => undefined),
        )
      }

      await Promise.allSettled(storageOps)
    } catch (storageErr) {
      console.error('[properties/[id] DELETE] storage cleanup error:', storageErr)
    }

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('[properties/[id] DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
