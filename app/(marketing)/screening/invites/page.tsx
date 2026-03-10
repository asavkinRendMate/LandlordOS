'use client'

import { useEffect, useState, useCallback } from 'react'
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-[fadeIn_0.2s_ease-out]">
      {message}
    </div>
  )
}

export default function InvitesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [invites, setInvites] = useState<InviteItem[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

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

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    const prev = invites
    setInvites((cur) => cur.filter((inv) => inv.id !== id))
    setConfirmDeleteId(null)

    try {
      const res = await fetch(`/api/screening/invites/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setInvites(prev)
        setToast('Failed to delete screening')
        return
      }
      setToast('Screening deleted')
    } catch {
      setInvites(prev)
      setToast('Failed to delete screening')
    } finally {
      setDeletingId(null)
    }
  }, [invites])

  const handleDeleteAll = useCallback(async () => {
    setDeletingAll(true)
    const prev = invites

    setInvites([])
    setShowDeleteAllModal(false)

    try {
      const res = await fetch('/api/screening/invites/all', { method: 'DELETE' })
      if (!res.ok) {
        setInvites(prev)
        setToast('Failed to delete screenings')
        return
      }
      setToast('All screenings deleted')
    } catch {
      setInvites(prev)
      setToast('Failed to delete screenings')
    } finally {
      setDeletingAll(false)
    }
  }, [invites])

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
        <div className="max-w-[1280px] mx-auto px-4 py-3 md:px-6 md:py-0 md:h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-icon.svg" alt="LetSorted" width={32} height={32} className="md:hidden" priority />
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="hidden md:block" priority />
          </Link>
          <div className="flex items-center gap-1.5 md:gap-2.5">
            <Link
              href="/screening"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm transition-colors"
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
                  className="text-gray-500 hover:text-gray-700 font-medium px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm transition-colors"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Screening invites</h1>
          {invites.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
            >
              Delete all screenings
            </button>
          )}
        </div>

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
                href="/screening#invite-form"
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
              const isConfirming = confirmDeleteId === inv.id
              return (
                <div key={inv.id} className={`bg-gray-50 rounded-xl border border-gray-100 p-4 transition-opacity duration-200 ${deletingId === inv.id ? 'opacity-50' : ''}`}>
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
                      <button
                        onClick={() => setConfirmDeleteId(isConfirming ? null : inv.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                        title="Delete screening"
                      >
                        <TrashIcon />
                      </button>
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
                  {/* Inline delete confirmation */}
                  {isConfirming && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                      <p className="text-xs text-gray-500">Delete this screening? This cannot be undone.</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete All modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete all screenings?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Delete all {invites.length} screening{invites.length !== 1 ? 's' : ''}? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-4 py-2 rounded-lg transition-colors"
              >
                {deletingAll ? 'Deleting...' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
