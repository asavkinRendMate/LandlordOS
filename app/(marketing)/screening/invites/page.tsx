'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface InviteItem {
  id: string
  candidateName: string
  candidateEmail: string
  propertyAddress: string
  monthlyRentPence: number
  status: string
  createdAt: string
  report: {
    id: string
    status: string
    totalScore: number | null
    grade: string | null
    isLocked: boolean
  } | null
}

type FilterTab = 'all' | 'PENDING' | 'COMPLETED' | 'PAID'

function statusBadge(status: string) {
  switch (status) {
    case 'PENDING':
    case 'STARTED':
      return { label: status === 'STARTED' ? 'Started' : 'Pending', cls: 'bg-gray-100 text-gray-600' }
    case 'COMPLETED':
      return { label: 'Completed', cls: 'bg-green-100 text-green-700' }
    case 'PAID':
      return { label: 'Unlocked', cls: 'bg-blue-100 text-blue-700' }
    case 'EXPIRED':
      return { label: 'Expired', cls: 'bg-red-100 text-red-600' }
    default:
      return { label: status, cls: 'bg-gray-100 text-gray-600' }
  }
}

function gradeBadgeColour(grade: string | null) {
  if (!grade) return 'bg-gray-100 text-gray-600'
  if (grade === 'Excellent' || grade === 'Good') return 'bg-green-100 text-green-700'
  if (grade === 'Fair') return 'bg-amber-100 text-amber-700'
  if (grade === 'Poor') return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function InvitesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [invites, setInvites] = useState<InviteItem[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent('/screening/invites')}`)
        return
      }
      setUserEmail(data.user.email ?? null)
    })

    fetch('/api/screening/invites')
      .then((res) => {
        if (res.status === 401) {
          router.replace(`/login?next=${encodeURIComponent('/screening/invites')}`)
          return null
        }
        return res.json()
      })
      .then((json) => {
        if (json?.data) setInvites(json.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  const filtered = filter === 'all'
    ? invites
    : invites.filter((inv) => {
        if (filter === 'PENDING') return inv.status === 'PENDING' || inv.status === 'STARTED'
        if (filter === 'COMPLETED') return inv.status === 'COMPLETED'
        if (filter === 'PAID') return inv.status === 'PAID'
        return true
      })

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'PAID', label: 'Unlocked' },
  ]

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} priority />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/screening"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Send invite
            </Link>
            {userEmail && (
              <>
                <span className="text-gray-400 text-sm hidden sm:inline">{userEmail}</span>
                <button
                  onClick={async () => {
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    router.push('/screening')
                  }}
                  className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 text-sm transition-colors"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Screening invites</h1>

        {/* Filter tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                filter === t.key
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">
              {filter === 'all' ? 'No invites sent yet.' : 'No invites match this filter.'}
            </p>
            {filter === 'all' && (
              <Link
                href="/screening"
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Send your first invite
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((inv) => {
              const badge = statusBadge(inv.status)
              return (
                <div key={inv.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{inv.candidateName}</span>
                    <div className="flex items-center gap-2">
                      {inv.report?.grade && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${gradeBadgeColour(inv.report.grade)}`}>
                          {inv.report.totalScore} — {inv.report.grade}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-1">
                    <span>{inv.candidateEmail}</span>
                    <span>{fmtDate(inv.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{inv.propertyAddress}</p>
                  {(inv.status === 'COMPLETED' || inv.status === 'PAID') && (
                    <Link
                      href={`/screening/report/${inv.id}`}
                      className="text-green-600 hover:text-green-700 text-xs font-medium mt-2 inline-block"
                    >
                      {inv.status === 'PAID' ? 'View report' : 'View & unlock report'}
                    </Link>
                  )}
                  {(inv.status === 'PENDING' || inv.status === 'STARTED') && (
                    <p className="text-gray-400 text-xs mt-2">Waiting for candidate</p>
                  )}
                  {inv.status === 'EXPIRED' && (
                    <p className="text-red-400 text-xs mt-2">Expired — send a new invite</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
