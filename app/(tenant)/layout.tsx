export const dynamic = 'force-dynamic'
export const revalidate = 0

import Footer from '@/components/shared/Footer'
import CrispChat from '@/components/shared/CrispChat'

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0f7f4] flex flex-col">
      <div className="flex-1">{children}</div>
      <Footer variant="app" />
      <CrispChat />
    </div>
  )
}
