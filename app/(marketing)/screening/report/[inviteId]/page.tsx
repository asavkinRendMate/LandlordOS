'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ScreeningReportDisplay, { type ScoringResult } from '@/components/shared/ScreeningReportDisplay'
import PaymentSetupModal from '@/components/shared/PaymentSetupModal'
import ScreeningLayout from '@/components/screening-flow/ScreeningLayout'
import { usePayment } from '@/hooks/usePayment'

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
  const [showPriceConfirm, setShowPriceConfirm] = useState(false)
  const [unlockPrice, setUnlockPrice] = useState('£9.99')
  const [unlockReason, setUnlockReason] = useState<'SCREENING_FIRST' | 'SCREENING_ADDITIONAL'>('SCREENING_FIRST')
  const [cardInfo, setCardInfo] = useState<{ last4: string; brand: string } | null>(null)
  const { showCardModal, requireCard, onCardSaveComplete, closeCardModal } = usePayment()

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

      if (inv) {
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
        setLoading(false)
        return
      }

      // Fallback: param may be a FinancialReport ID (property application flow)
      const reportRes = await fetch(`/api/scoring/${inviteId}`)
      if (!reportRes.ok) {
        setError('Invite not found or you don\'t have access')
        setLoading(false)
        return
      }
      const reportJson = await reportRes.json()
      const report = reportJson.data
      if (!report) {
        setError('Invite not found or you don\'t have access')
        setLoading(false)
        return
      }

      // Build invite-like object from report data
      const addr = report.property
        ? [report.property.line1, report.property.line2, report.property.city, report.property.postcode].filter(Boolean).join(', ')
        : ''
      setInvite({
        id: report.id,
        candidateName: report.applicantName ?? report.tenant?.name ?? 'Applicant',
        candidateEmail: report.tenant?.email ?? '',
        propertyAddress: addr,
        monthlyRentPence: report.monthlyRentPence ?? 0,
        status: report.status === 'COMPLETED' ? 'COMPLETED' : report.status,
        report: {
          id: report.id,
          status: report.status,
          totalScore: report.totalScore,
          grade: report.grade,
          isLocked: report.isLocked,
        },
      })
      if (report.status === 'COMPLETED') {
        setScoring(report)
        setIsLocked(report.isLocked)
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
    requireCard(async () => {
      // Determine price: first or additional screening
      try {
        const invitesRes = await fetch('/api/screening/invites')
        const invitesJson = await invitesRes.json()
        const paidCount = (invitesJson.data ?? []).filter(
          (i: InviteListItem) => i.status === 'PAID',
        ).length

        const reason = paidCount === 0 ? 'SCREENING_FIRST' as const : 'SCREENING_ADDITIONAL' as const
        const price = reason === 'SCREENING_FIRST' ? '£9.99' : '£1.49'
        setUnlockReason(reason)
        setUnlockPrice(price)

        // Fetch card info for confirmation display
        const subRes = await fetch('/api/payment/subscription')
        const subJson = await subRes.json()
        if (subJson.data?.card) setCardInfo(subJson.data.card)

        setShowPriceConfirm(true)
      } catch {
        setError('Something went wrong')
      }
    })
  }

  async function confirmUnlock() {
    setShowPriceConfirm(false)
    setUnlocking(true)
    try {
      const chargeRes = await fetch('/api/payment/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: unlockReason, inviteId }),
      })
      const chargeJson = await chargeRes.json()
      if (!chargeRes.ok) {
        setError(chargeJson.error || 'Payment failed')
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
      <div className="min-h-screen bg-[#f5f7f2] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────────

  if (error && !invite) {
    return (
      <ScreeningLayout navLink={{ href: '/screening/invites', label: 'All invites' }}>
        <div className="max-w-sm mx-auto text-center">
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
      </ScreeningLayout>
    )
  }

  return (
    <ScreeningLayout navLink={{ href: '/screening/invites', label: 'All invites' }}>
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
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
            unlockPriceDisplay={unlockPrice}
          />

          {/* Price confirmation */}
          {showPriceConfirm && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-gray-700 font-medium mb-2">
                Confirm payment of {unlockPrice}
              </p>
              {cardInfo && (
                <p className="text-xs text-gray-500 mb-3">
                  Charging {cardInfo.brand} ending in {cardInfo.last4}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={confirmUnlock}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Confirm {unlockPrice}
                </button>
                <button
                  onClick={() => setShowPriceConfirm(false)}
                  className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <PaymentSetupModal
        isOpen={showCardModal}
        onClose={closeCardModal}
        onSuccess={onCardSaveComplete}
        context="Add a payment method to unlock screening reports."
      />
    </ScreeningLayout>
  )
}
