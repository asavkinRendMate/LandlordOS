'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ScreeningReportDisplay, { type ScoringResult } from '@/components/shared/ScreeningReportDisplay'

interface InviteListItem {
  id: string
  candidateName: string
  candidateEmail: string
  propertyAddress: string
  monthlyRentPence: number
  status: string
  report: {
    id: string
    status: string
    totalScore: number | null
    grade: string | null
    isLocked: boolean
  } | null
}

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const inviteId = params.inviteId as string

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteListItem | null>(null)
  const [scoring, setScoring] = useState<ScoringResult | null>(null)
  const [isLocked, setIsLocked] = useState(true)
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch invite + report ───────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      // First check auth by fetching invites
      const invitesRes = await fetch('/api/screening/invites')
      if (invitesRes.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/screening/report/${inviteId}`)}`)
        return
      }

      const invitesJson = await invitesRes.json()
      const inv = invitesJson.data?.find((i: InviteListItem) => i.id === inviteId)

      if (!inv) {
        setError('Invite not found or you don\'t have access')
        setLoading(false)
        return
      }

      setInvite(inv)

      // If there's a completed report, fetch full details
      if (inv.report?.id && inv.report.status === 'COMPLETED') {
        const reportRes = await fetch(`/api/scoring/${inv.report.id}`)
        const reportJson = await reportRes.json()
        if (reportJson.data) {
          setScoring(reportJson.data)
          setIsLocked(inv.report.isLocked)
        }
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [inviteId, router])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Unlock ──────────────────────────────────────────────────────────────────────

  async function handleUnlock() {
    setUnlocking(true)
    try {
      const res = await fetch(`/api/screening/report/${inviteId}/unlock`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Unlock failed')
        return
      }
      setIsLocked(false)
      // Refetch to get full report data
      const reportRes = await fetch(`/api/scoring/${invite?.report?.id}`)
      const reportJson = await reportRes.json()
      if (reportJson.data) setScoring(reportJson.data)
    } catch {
      setError('Something went wrong')
    } finally {
      setUnlocking(false)
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────────

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Not found</h1>
          <p className="text-gray-500 text-sm">{error}</p>
          <Link href="/screening/invites" className="text-green-600 hover:text-green-700 text-sm font-medium mt-4 inline-block">
            Back to invites
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} priority />
          </Link>
          <Link
            href="/screening/invites"
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            All invites
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto py-10 px-4">
        {/* Invite info */}
        {invite && (
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{invite.candidateName}</h1>
            <p className="text-gray-500 text-sm">
              {invite.propertyAddress} &middot; £{(invite.monthlyRentPence / 100).toLocaleString('en-GB')}/mo
            </p>
          </div>
        )}

        {/* No report yet */}
        {!scoring && (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 mb-1">Waiting for candidate</h2>
            <p className="text-gray-500 text-sm">
              {invite?.candidateName} hasn&apos;t completed their check yet. We&apos;ll email you when the report is ready.
            </p>
            <p className="text-gray-400 text-xs mt-3">
              Status: {invite?.status === 'STARTED' ? 'Started' : 'Pending'}
            </p>
          </div>
        )}

        {/* Report display */}
        {scoring && (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <ScreeningReportDisplay
              scoring={scoring}
              applicantName={invite?.candidateName}
              isLocked={isLocked}
              onUnlock={handleUnlock}
              unlocking={unlocking}
              showVerificationLink={!isLocked}
            />
            {isLocked && (
              <p className="text-xs text-gray-400 text-center mt-3">
                During beta, unlock is free. You won&apos;t be charged.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
