'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ScreeningReportDisplay, { type ScoringResult } from '@/components/shared/ScreeningReportDisplay'
import PaymentSetupModal from '@/components/shared/PaymentSetupModal'
import ScreeningLayout from '@/components/screening-flow/ScreeningLayout'

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
  const reportId = params.reportId as string

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteListItem | null>(null)
  const [scoring, setScoring] = useState<ScoringResult | null>(null)
  const [isLocked, setIsLocked] = useState(true)
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPriceConfirm, setShowPriceConfirm] = useState(false)
  const [unlockPrice, setUnlockPrice] = useState('£9.99')
  const [unlockMethod, setUnlockMethod] = useState<string>('subscriber')
  const [cardInfo, setCardInfo] = useState<{ last4: string; brand: string } | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const pendingAutoUnlockRef = useRef(false)

  // ── Fetch report ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      // Auth check
      const authRes = await fetch('/api/screening/invites')
      if (authRes.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/screening/report/${reportId}`)}`)
        return
      }

      // Always use reportId from URL params directly
      const reportRes = await fetch(`/api/scoring/${reportId}`)
      if (!reportRes.ok) {
        setError('Report not found or you don\'t have access')
        setLoading(false)
        return
      }
      const reportJson = await reportRes.json()
      const report = reportJson.data
      if (!report) {
        setError('Report not found or you don\'t have access')
        setLoading(false)
        return
      }

      // Build display data from report
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
  }, [reportId, router])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Unlock ──────────────────────────────────────────────────────────────────────

  async function handleUnlock() {
    setError(null)

    try {
      // 1. Fetch server-side pricing
      const priceRes = await fetch(`/api/payment/unlock-price?reportId=${reportId}`)
      const priceJson = await priceRes.json()

      if (!priceRes.ok) {
        setError(priceJson.error || 'Unable to determine price')
        return
      }

      const data = priceJson.data
      setUnlockMethod(data.method)

      // 2. Credit pack — no card needed, show confirm directly
      if (data.method === 'credit_pack') {
        setUnlockPrice('1 credit')
        setShowPriceConfirm(true)
        return
      }

      // 3. Card-based pricing
      const price = `£${(data.amountPence / 100).toFixed(2)}`
      setUnlockPrice(price)

      // Check for saved card
      const cardRes = await fetch('/api/payment/has-card')
      const cardJson = await cardRes.json()

      if (cardJson.data?.hasCard) {
        // Has card → fetch card info for confirmation display
        const subRes = await fetch('/api/payment/subscription')
        const subJson = await subRes.json()
        if (subJson.data?.card) setCardInfo(subJson.data.card)
        setShowPriceConfirm(true)
      } else {
        // No card → open PaymentSetupModal, auto-unlock after card saved
        pendingAutoUnlockRef.current = true
        setShowCardModal(true)
      }
    } catch {
      setError('Something went wrong')
    }
  }

  async function confirmUnlock() {
    setShowPriceConfirm(false)
    setUnlocking(true)
    try {
      const chargeRes = await fetch('/api/payment/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })
      const chargeJson = await chargeRes.json()
      if (!chargeRes.ok) {
        setError(chargeJson.error || 'Payment failed')
        return
      }

      setIsLocked(false)
      // Refetch to get full report data — always use reportId from URL params
      const reportRes = await fetch(`/api/scoring/${reportId}`)
      const reportJson = await reportRes.json()
      if (reportJson.data) setScoring(reportJson.data)
    } catch {
      setError('Something went wrong')
    } finally {
      setUnlocking(false)
    }
  }

  function handleCardSaved() {
    setShowCardModal(false)
    if (pendingAutoUnlockRef.current) {
      pendingAutoUnlockRef.current = false
      confirmUnlock()
    }
  }

  function handleCardModalClose() {
    setShowCardModal(false)
    pendingAutoUnlockRef.current = false
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
                {unlockMethod === 'credit_pack'
                  ? 'Use 1 credit to unlock this report?'
                  : `Confirm payment of ${unlockPrice}`}
              </p>
              {cardInfo && unlockMethod === 'subscriber' && (
                <p className="text-xs text-gray-500 mb-3">
                  Charging {cardInfo.brand} ending in {cardInfo.last4}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={confirmUnlock}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {unlockMethod === 'credit_pack' ? 'Use credit' : `Confirm ${unlockPrice}`}
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
        onClose={handleCardModalClose}
        onSuccess={handleCardSaved}
        context="Add a payment method to unlock this screening report."
      />
    </ScreeningLayout>
  )
}
