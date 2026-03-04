import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/components/dashboard/shell'

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

  return (
    <DashboardShell user={user} hasTenantProfile={!!tenantProfile}>
      {children}
    </DashboardShell>
  )
}
