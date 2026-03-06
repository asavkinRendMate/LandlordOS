import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/components/dashboard/shell'
import NameModalGate from '@/components/dashboard/NameModalGate'

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
    select: { name: true },
  }).catch(() => null)

  const needsName = !tenantProfile && (!dbUser?.name || dbUser.name.trim().length === 0)

  return (
    <DashboardShell
      user={user}
      hasTenantProfile={!!tenantProfile}
      openMaintenanceCount={openMaintenanceCount}
    >
      <NameModalGate needsName={needsName}>
        {children}
      </NameModalGate>
    </DashboardShell>
  )
}
