'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// ── Nav config ────────────────────────────────────────────────────────────────

const navItems = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

// ── Shared sub-components ─────────────────────────────────────────────────────

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {navItems.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function UserFooter({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="px-3 py-4 border-t border-white/8">
      <div className="px-3 py-2 mb-1">
        <p className="text-xs text-white/40 truncate">{email}</p>
      </div>
      <button
        onClick={onSignOut}
        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-green-400/80 hover:text-green-300 hover:bg-green-500/8 transition-colors border border-green-500/20"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
}

export function DashboardShell({ user, children, hasTenantProfile }: DashboardShellProps) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const initials = (user.email ?? 'U')[0].toUpperCase()

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#0f1a0f]">

      {/* ── Desktop layout (lg+) ────────────────────────────────────────────── */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-56 shrink-0 flex flex-col border-r border-white/8">
          <div className="px-5 py-5 border-b border-white/8">
            <span className="text-white font-bold text-base tracking-tight">LetSorted</span>
          </div>
          <NavLinks />
          {hasTenantProfile && <ContextSwitcher />}
          <UserFooter email={user.email ?? ''} onSignOut={handleSignOut} />
        </aside>
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>

      {/* ── Mobile layout (<lg) ─────────────────────────────────────────────── */}
      <div className="lg:hidden flex flex-col min-h-screen">

        {/* Sticky top bar */}
        <header className="sticky top-0 z-30 h-14 bg-[#0f1a0f]/95 backdrop-blur-sm border-b border-white/8 flex items-center justify-between px-4 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-colors"
            aria-label="Open navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span className="text-white font-bold text-base tracking-tight">LetSorted</span>

          <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <span className="text-green-400 text-xs font-semibold">{initials}</span>
          </div>
        </header>

        {/* Drawer backdrop */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Slide-in drawer */}
        <div
          className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0f1a0f] border-r border-white/8 flex flex-col transition-transform duration-200 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <span className="text-white font-bold text-base tracking-tight">LetSorted</span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
              aria-label="Close navigation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <NavLinks onNavigate={() => setDrawerOpen(false)} />
          {hasTenantProfile && <ContextSwitcher />}
          <UserFooter email={user.email ?? ''} onSignOut={handleSignOut} />
        </div>

        {/* Page content */}
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>

    </div>
  )
}
