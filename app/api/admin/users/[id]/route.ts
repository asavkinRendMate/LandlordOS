import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await verifyAdminSession()
  if (authError) return authError

  const { id: userId } = await params

  try {
    // Get user's properties and tenant profiles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        properties: { select: { id: true } },
        tenantProfiles: { select: { id: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const propertyIds = user.properties.map((p) => p.id)
    const tenantProfileIds = user.tenantProfiles.map((t) => t.id)

    await prisma.$transaction(async (tx) => {
      // 1. DocumentAcknowledgments for tenants on user's properties
      if (propertyIds.length > 0) {
        const propertyTenants = await tx.tenant.findMany({
          where: { propertyId: { in: propertyIds } },
          select: { id: true },
        })
        const propertyTenantIds = propertyTenants.map((t) => t.id)
        if (propertyTenantIds.length > 0) {
          await tx.documentAcknowledgment.deleteMany({
            where: { tenantId: { in: propertyTenantIds } },
          })

          // 2. TenantDocuments for tenants on user's properties
          await tx.tenantDocument.deleteMany({
            where: { tenantId: { in: propertyTenantIds } },
          })
        }
      }

      // Also delete acknowledgments for user's own tenant profiles
      if (tenantProfileIds.length > 0) {
        await tx.documentAcknowledgment.deleteMany({
          where: { tenantId: { in: tenantProfileIds } },
        })
        await tx.tenantDocument.deleteMany({
          where: { tenantId: { in: tenantProfileIds } },
        })
      }

      if (propertyIds.length > 0) {
        // 3. MaintenancePhotos
        const maintenanceRequests = await tx.maintenanceRequest.findMany({
          where: { propertyId: { in: propertyIds } },
          select: { id: true },
        })
        const requestIds = maintenanceRequests.map((r) => r.id)

        if (requestIds.length > 0) {
          await tx.maintenancePhoto.deleteMany({
            where: { requestId: { in: requestIds } },
          })

          // 4. MaintenanceStatusHistory
          await tx.maintenanceStatusHistory.deleteMany({
            where: { requestId: { in: requestIds } },
          })
        }

        // 5. MaintenanceRequests
        await tx.maintenanceRequest.deleteMany({
          where: { propertyId: { in: propertyIds } },
        })

        // 6. FinancialReports (for properties and tenants)
        await tx.financialReport.deleteMany({
          where: {
            OR: [
              { propertyId: { in: propertyIds } },
              ...(tenantProfileIds.length > 0
                ? [{ tenantId: { in: tenantProfileIds } }]
                : []),
            ],
          },
        })

        // 7. RentPayments via tenancies
        const tenancies = await tx.tenancy.findMany({
          where: { propertyId: { in: propertyIds } },
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
          where: { propertyId: { in: propertyIds } },
        })

        // 9. PropertyDocuments
        const propertyDocs = await tx.propertyDocument.findMany({
          where: { propertyId: { in: propertyIds } },
          select: { id: true },
        })
        if (propertyDocs.length > 0) {
          await tx.documentAcknowledgment.deleteMany({
            where: { documentId: { in: propertyDocs.map((d) => d.id) } },
          })
        }
        await tx.propertyDocument.deleteMany({
          where: { propertyId: { in: propertyIds } },
        })

        // ComplianceDocs
        await tx.complianceDoc.deleteMany({
          where: { propertyId: { in: propertyIds } },
        })

        // 10. Tenants linked to user's properties (as landlord)
        await tx.tenant.deleteMany({
          where: { propertyId: { in: propertyIds } },
        })
      }

      // 11. Tenants where userId = this user (tenant profiles not on own properties)
      await tx.tenant.deleteMany({
        where: { userId: userId },
      })

      // 12. Properties
      await tx.property.deleteMany({
        where: { userId: userId },
      })

      // 13. User record
      await tx.user.delete({
        where: { id: userId },
      })
    })

    // Delete from Supabase Auth
    const supabase = createServerClient()
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      console.error('Admin: failed to delete Supabase auth user', authDeleteError)
      // DB records already deleted, log but don't fail
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Admin: failed to delete user', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
