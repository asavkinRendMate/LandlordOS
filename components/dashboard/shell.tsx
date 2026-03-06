'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import Footer from '@/components/shared/Footer'
import CrispChat from '@/components/shared/CrispChat'

// ── Nav config ────────────────────────────────────────────────────────────────

const navItems = [
  {
    label: 'Overview',
    href: '/dashboard',
    exact: true,
    showBadge: false,
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    label: 'Properties',
    href: '/dashboard/properties',
    exact: false,
    showBadge: false,
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: 'Maintenance',
    href: '/dashboard/maintenance',
    exact: false,
    showBadge: true,
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    exact: false,
    showBadge: false,
    icon: (
      <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

// ── Shared sub-components ─────────────────────────────────────────────────────

function NavLinks({
  onNavigate,
  openMaintenanceCount = 0,
}: {
  onNavigate?: () => void
  openMaintenanceCount?: number
}) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {navItems.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              active
                ? 'bg-[#16a34a]/10 text-[#16a34a]'
                : 'text-[#6B7280] hover:text-[#1A1A1A] hover:bg-gray-50'
            }`}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.showBadge && openMaintenanceCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {openMaintenanceCount > 9 ? '9+' : openMaintenanceCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function UserFooter({ email, onSignOut, onOpenChat }: { email: string; onSignOut: () => void; onOpenChat?: () => void }) {
  return (
    <div className="px-3 py-4 border-t border-gray-100">
      <div className="px-3 py-1.5 mb-1">
        <p className="text-xs text-[#9CA3AF] truncate">{email}</p>
      </div>
      {onOpenChat && (
        <button
          onClick={onOpenChat}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#16a34a] hover:bg-green-50 transition-all duration-150"
        >
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
          Chat with support
        </button>
      )}
      <button
        onClick={onSignOut}
        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-gray-50 transition-all duration-150"
      >
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sign out
      </button>
    </div>
  )
}

// ── Context switcher ──────────────────────────────────────────────────────────

function ContextSwitcher() {
  return (
    <div className="px-3 pb-3">
      <a
        href="/tenant/dashboard"
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[#16a34a] hover:bg-green-50 transition-all duration-150 border border-green-200"
      >
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        My Rental
      </a>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

interface DashboardShellProps {
  user: User
  children: React.ReactNode
  hasTenantProfile?: boolean
  openMaintenanceCount?: number
}

export function DashboardShell({
  user,
  children,
  hasTenantProfile,
  openMaintenanceCount = 0,
}: DashboardShellProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const initials = (user.email ?? 'U')[0].toUpperCase()

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const handleOpenChat = useCallback(() => {
    if (typeof window !== 'undefined' && window.$crisp) {
      window.$crisp.push(['do', 'chat:open'])
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#F7F8F6]">
      <CrispChat
        user={{ email: user.email ?? '', name: user.user_metadata?.name ?? null, id: user.id }}
        role="landlord"
      />

      {/* ── Desktop layout (lg+) ────────────────────────────────────────────── */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-black/[0.06]">
          <div className="px-5 py-5 border-b border-gray-100">
            <Image src="/logo.svg" alt="LetSorted" width={120} height={40} />
          </div>
          <NavLinks openMaintenanceCount={openMaintenanceCount} />
          {hasTenantProfile && <ContextSwitcher />}
          <UserFooter email={user.email ?? ''} onSignOut={handleSignOut} onOpenChat={handleOpenChat} />
        </aside>
        <main className="flex-1 min-w-0 overflow-auto flex flex-col bg-[#F7F8F6]">
          <div className="flex-1">{children}</div>
          <Footer variant="app" />
        </main>
      </div>

      {/* ── Mobile layout (<lg) ─────────────────────────────────────────────── */}
      <div className="lg:hidden flex flex-col min-h-screen">

        {/* Sticky top bar */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-sm border-b border-black/[0.06] flex items-center justify-between px-4 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#1A1A1A] hover:bg-gray-100 transition-all duration-150"
            aria-label="Open navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Image src="/logo.svg" alt="LetSorted" width={100} height={33} />

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenChat}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#6B7280] hover:text-[#16a34a] hover:bg-[#16a34a]/10 transition-all duration-150"
              title="Chat with support"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#16a34a]/10 border border-[#16a34a]/20 flex items-center justify-center">
              <span className="text-[#16a34a] text-xs font-semibold">{initials}</span>
            </div>
          </div>
        </header>

        {/* Drawer backdrop */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Slide-in drawer */}
        <div
          className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-black/[0.06] flex flex-col transition-transform duration-200 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <Image src="/logo.svg" alt="LetSorted" width={120} height={40} />
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-gray-100 transition-all duration-150"
              aria-label="Close navigation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <NavLinks onNavigate={() => setDrawerOpen(false)} openMaintenanceCount={openMaintenanceCount} />
          {hasTenantProfile && <ContextSwitcher />}
          <UserFooter email={user.email ?? ''} onSignOut={handleSignOut} onOpenChat={handleOpenChat} />
        </div>

        {/* Page content */}
        <main className="flex-1 min-w-0 overflow-auto flex flex-col bg-[#F7F8F6]">
          <div className="flex-1">{children}</div>
          <Footer variant="app" />
        </main>
      </div>

    </div>
  )
}
