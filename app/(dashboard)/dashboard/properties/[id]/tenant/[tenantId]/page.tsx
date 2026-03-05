import { redirect, notFound } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import TenantDetailClient from './client'

export default async function TenantDetailPage({
  params,
}: {
  params: { id: string; tenantId: string }
}) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenant = await prisma.tenant.findFirst({
    where: { id: params.tenantId, propertyId: params.id },
    include: {
      property: true,
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  })

  if (!tenant || tenant.property.userId !== user.id) notFound()

  // Serialize Prisma Dates to ISO strings for client component
  const serialized = {
    ...tenant,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
    confirmedAt: tenant.confirmedAt?.toISOString() ?? null,
    documents: tenant.documents.map((d) => ({
      ...d,
      uploadedAt: d.uploadedAt.toISOString(),
      expiryDate: d.expiryDate?.toISOString() ?? null,
    })),
  }

  return <TenantDetailClient tenant={serialized} propertyId={params.id} />
}
