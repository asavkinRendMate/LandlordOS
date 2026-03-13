import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    const demoUsers = await prisma.user.findMany({
      where: { isDemo: true, createdAt: { lt: cutoff } },
      select: { id: true, email: true },
    })

    if (demoUsers.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0 })
    }

    const supabase = createServerClient()
    let deleted = 0

    for (const user of demoUsers) {
      try {
        // Cascade delete in FK-safe order (same pattern as property delete)
        await prisma.$transaction(async (tx) => {
          const propertyIds = (await tx.property.findMany({
            where: { userId: user.id },
            select: { id: true },
          })).map((p) => p.id)

          if (propertyIds.length > 0) {
            // Deep cascade for each property
            await tx.inspectionPhoto.deleteMany({ where: { inspection: { propertyId: { in: propertyIds } } } })
            await tx.propertyInspection.deleteMany({ where: { propertyId: { in: propertyIds } } })
            await tx.maintenancePhoto.deleteMany({ where: { request: { propertyId: { in: propertyIds } } } })
            await tx.maintenanceStatusHistory.deleteMany({ where: { request: { propertyId: { in: propertyIds } } } })
            await tx.maintenanceRequest.deleteMany({ where: { propertyId: { in: propertyIds } } })
            await tx.screeningLog.deleteMany({ where: { screeningReport: { propertyId: { in: propertyIds } } } })
            await tx.financialReport.deleteMany({ where: { propertyId: { in: propertyIds } } })
            await tx.documentAcknowledgment.deleteMany({ where: { document: { propertyId: { in: propertyIds } } } })
            await tx.tenantDocument.deleteMany({ where: { tenant: { propertyId: { in: propertyIds } } } })
            await tx.rentPayment.deleteMany({ where: { tenancy: { propertyId: { in: propertyIds } } } })
            await tx.inspectionSchedule.deleteMany({ where: { tenancy: { propertyId: { in: propertyIds } } } })
            await tx.tenancyContract.deleteMany({ where: { tenancy: { propertyId: { in: propertyIds } } } })
            await tx.tenancy.deleteMany({ where: { propertyId: { in: propertyIds } } })
            await tx.tenant.deleteMany({ where: { propertyId: { in: propertyIds } } })
            await tx.propertyDocument.deleteMany({ where: { propertyId: { in: propertyIds } } })
            await tx.complianceDoc.deleteMany({ where: { propertyId: { in: propertyIds } } })
            await tx.propertyRoom.deleteMany({ where: { propertyId: { in: propertyIds } } })
            await tx.applicationInvite.deleteMany({ where: { propertyId: { in: propertyIds } } })
            await tx.property.deleteMany({ where: { id: { in: propertyIds } } })
          }

          // Delete user-level data
          await tx.screeningLog.deleteMany({ where: { screeningReport: { invite: { landlordId: user.id } } } })
          await tx.financialReport.deleteMany({ where: { invite: { landlordId: user.id } } })
          await tx.screeningInvite.deleteMany({ where: { landlordId: user.id } })
          await tx.screeningPackageUsage.deleteMany({ where: { package: { userId: user.id } } })
          await tx.screeningPackage.deleteMany({ where: { userId: user.id } })
          await tx.payment.deleteMany({ where: { userId: user.id } })
          await tx.complianceAlertLog.deleteMany({ where: { userId: user.id } })
          await tx.user.delete({ where: { id: user.id } })
        })

        // Delete Supabase auth user (best-effort)
        await supabase.auth.admin.deleteUser(user.id)

        deleted++
      } catch (err) {
        console.error(`[demo-cleanup] Failed to delete demo user ${user.id}:`, err)
      }
    }

    console.log(`[demo-cleanup] Deleted ${deleted} demo accounts`)
    return NextResponse.json({ ok: true, deleted })
  } catch (error) {
    console.error('[demo-cleanup] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
