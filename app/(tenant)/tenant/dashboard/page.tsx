import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import TenantDashboardClient from './client'

export default async function TenantDashboardPage() {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Ensure the user row exists in our DB (tenant signing in for the first time)
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email! },
    update: {},
  })

  // Find and link their Tenant profile by email if not yet linked
  const tenant = await prisma.tenant.findFirst({
    where: {
      email: user.email!,
      status: { in: ['TENANT', 'INVITED'] },
    },
    include: {
      property: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (tenant && !tenant.userId) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { userId: user.id },
    })
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <h1 className="text-gray-900 font-bold text-xl mb-2">No tenancy found</h1>
          <p className="text-gray-500 text-sm">
            We couldn&apos;t find an active tenancy linked to <strong>{user.email}</strong>.
            Please contact your landlord.
          </p>
        </div>
      </div>
    )
  }

  const { property } = tenant
  const address = [property.line1, property.line2, property.city, property.postcode].filter(Boolean).join(', ')

  // Check for an active move-in inspection report (anything beyond DRAFT)
  const inspection = await prisma.propertyInspection.findFirst({
    where: {
      tenantId: tenant.id,
      inspectionType: 'MOVE_IN',
      status: { in: ['PENDING', 'IN_REVIEW', 'AGREED', 'DISPUTED'] },
    },
    select: {
      id: true,
      status: true,
      token: true,
      tenantConfirmedAt: true,
      pdfUrl: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch periodic inspections for this tenant
  const periodicInspections = await prisma.propertyInspection.findMany({
    where: {
      tenantId: tenant.id,
      inspectionType: 'PERIODIC',
      status: { in: ['PENDING', 'IN_REVIEW', 'AGREED', 'DISPUTED'] },
    },
    select: {
      id: true,
      status: true,
      token: true,
      inspectionNumber: true,
      scheduledDate: true,
      tenantConfirmedAt: true,
      noticeSeenAt: true,
      pdfUrl: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <TenantDashboardClient
      tenant={{
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        status: tenant.status,
        onboardingState: tenant.onboardingState as Record<string, boolean> | null,
      }}
      property={{
        id: property.id,
        address,
        landlordName: property.user.name ?? 'Your landlord',
        landlordEmail: property.user.email,
      }}
      inspection={inspection ? {
        id: inspection.id,
        status: inspection.status,
        token: inspection.token,
        tenantConfirmedAt: inspection.tenantConfirmedAt?.toISOString() ?? null,
        hasPdf: !!inspection.pdfUrl,
      } : null}
      periodicInspections={periodicInspections.map((pi) => ({
        id: pi.id,
        status: pi.status,
        token: pi.token,
        inspectionNumber: pi.inspectionNumber,
        scheduledDate: pi.scheduledDate?.toISOString() ?? null,
        tenantConfirmedAt: pi.tenantConfirmedAt?.toISOString() ?? null,
        noticeSeenAt: pi.noticeSeenAt?.toISOString() ?? null,
        hasPdf: !!pi.pdfUrl,
      }))}
    />
  )
}
