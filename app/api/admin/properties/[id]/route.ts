import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await verifyAdminSession()
  if (authError) return authError

  const { id: propertyId } = await params

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // 1. DocumentAcknowledgments (via property's tenants and property's documents)
      const tenants = await tx.tenant.findMany({
        where: { propertyId },
        select: { id: true },
      })
      const tenantIds = tenants.map((t) => t.id)

      if (tenantIds.length > 0) {
        await tx.documentAcknowledgment.deleteMany({
          where: { tenantId: { in: tenantIds } },
        })

        // 2. TenantDocuments
        await tx.tenantDocument.deleteMany({
          where: { tenantId: { in: tenantIds } },
        })
      }

      // Also delete acknowledgments on property documents
      const propertyDocs = await tx.propertyDocument.findMany({
        where: { propertyId },
        select: { id: true },
      })
      if (propertyDocs.length > 0) {
        await tx.documentAcknowledgment.deleteMany({
          where: { documentId: { in: propertyDocs.map((d) => d.id) } },
        })
      }

      // 3-5. Maintenance
      const maintenanceRequests = await tx.maintenanceRequest.findMany({
        where: { propertyId },
        select: { id: true },
      })
      const requestIds = maintenanceRequests.map((r) => r.id)

      if (requestIds.length > 0) {
        await tx.maintenancePhoto.deleteMany({
          where: { requestId: { in: requestIds } },
        })
        await tx.maintenanceStatusHistory.deleteMany({
          where: { requestId: { in: requestIds } },
        })
      }
      await tx.maintenanceRequest.deleteMany({
        where: { propertyId },
      })

      // 6. FinancialReports
      await tx.financialReport.deleteMany({
        where: {
          OR: [
            { propertyId },
            ...(tenantIds.length > 0
              ? [{ tenantId: { in: tenantIds } }]
              : []),
          ],
        },
      })

      // 7. RentPayments via tenancies
      const tenancies = await tx.tenancy.findMany({
        where: { propertyId },
        select: { id: true },
      })
      const tenancyIds = tenancies.map((t) => t.id)

      if (tenancyIds.length > 0) {
        await tx.rentPayment.deleteMany({
          where: { tenancyId: { in: tenancyIds } },
        })
      }

      // 8. Tenancies
      await tx.tenancy.deleteMany({
        where: { propertyId },
      })

      // 9. PropertyDocuments
      await tx.propertyDocument.deleteMany({
        where: { propertyId },
      })

      // ComplianceDocs
      await tx.complianceDoc.deleteMany({
        where: { propertyId },
      })

      // 10. Tenants
      await tx.tenant.deleteMany({
        where: { propertyId },
      })

      // 11. Property
      await tx.property.delete({
        where: { id: propertyId },
      })
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Admin: failed to delete property', error)
    return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 })
  }
}
