import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/auth'
import { DashboardShell } from '@/components/dashboard/shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <DashboardShell user={user}>{children}</DashboardShell>
}
