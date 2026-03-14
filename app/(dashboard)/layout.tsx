export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/components/dashboard/shell'
import NameModalGate from '@/components/dashboard/NameModalGate'
import PostHogIdentify from '@/components/shared/PostHogIdentify'
import CrispChat from '@/components/shared/CrispChat'
import UpgradeBanner from '@/components/dashboard/UpgradeBanner'
import DemoBanner from '@/components/dashboard/DemoBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if this user also has an active tenant profile (for context switcher)
  const tenantProfile = await prisma.tenant.findFirst({
    where: { email: user.email!, status: 'TENANT' },
    select: { id: true },
  }).catch(() => null)

  const openMaintenanceCount = await prisma.maintenanceRequest.count({
    where: { property: { userId: user.id }, status: 'OPEN' },
  }).catch(() => 0)

  // Check if landlord needs to set their name (new user, no name, not a tenant-only user)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, subscriptionStatus: true, isDemo: true },
  }).catch(() => null)

  const isDemo = dbUser?.isDemo ?? false
  const needsName = !isDemo && !tenantProfile && (!dbUser?.name || dbUser.name.trim().length === 0)

  return (
    <DashboardShell
      user={user}
      hasTenantProfile={!!tenantProfile}
      openMaintenanceCount={openMaintenanceCount}
    >
      {isDemo && <DemoBanner />}
      <UpgradeBanner subscriptionStatus={dbUser?.subscriptionStatus ?? 'NONE'} />
      <PostHogIdentify userId={user.id} />
      <CrispChat user={{ email: user.email!, name: dbUser?.name, id: user.id }} role="landlord" />
      <NameModalGate needsName={needsName}>
        {children}
      </NameModalGate>
    </DashboardShell>
  )
}
