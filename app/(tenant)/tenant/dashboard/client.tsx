'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  tenant: { name: string; email: string }
  property: { address: string; landlordName: string; landlordEmail: string }
}

function PlaceholderSection({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
          {icon}
        </div>
        <h2 className="text-gray-900 font-semibold">{title}</h2>
      </div>
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
        <p className="text-gray-400 text-sm">Coming soon</p>
      </div>
    </div>
  )
}

export default function TenantDashboardClient({ tenant, property }: Props) {
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#f0f7f4]">

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-[#f0f7f4]/90 backdrop-blur-sm border-b border-green-200/60 px-4 h-14 flex items-center justify-between">
        <span className="text-[#0f1a0f] font-bold text-base tracking-tight">LetSorted</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">My Rental</span>
          <button
            onClick={signOut}
            className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-gray-900 text-2xl font-bold mb-1">
            Hi, {tenant.name.split(' ')[0]}
          </h1>
          <p className="text-gray-500 text-sm">Welcome to your tenant portal</p>
        </div>

        {/* Property card */}
        <div className="bg-[#0f1a0f] rounded-2xl p-5 mb-6 text-white">
          <p className="text-white/50 text-xs uppercase tracking-wide font-medium mb-1">Your property</p>
          <p className="text-white font-semibold text-base mb-3">{property.address}</p>
          <div className="border-t border-white/10 pt-3">
            <p className="text-white/50 text-xs uppercase tracking-wide font-medium mb-1">Landlord</p>
            <p className="text-white/80 text-sm">{property.landlordName}</p>
            <a href={`mailto:${property.landlordEmail}`} className="text-green-400 text-xs hover:text-green-300 transition-colors">
              {property.landlordEmail}
            </a>
          </div>
        </div>

        {/* If this user is also a landlord, show link to switch */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            </svg>
            Switch to landlord dashboard
          </Link>
        </div>

        {/* Placeholder sections */}
        <div className="space-y-4">
          <PlaceholderSection
            title="Rent payments"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <PlaceholderSection
            title="Maintenance requests"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          <PlaceholderSection
            title="Documents"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
        </div>
      </main>
    </div>
  )
}
