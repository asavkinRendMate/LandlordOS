'use client'

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback, useRef } from 'react'
import DocumentUploadModal from '@/components/shared/DocumentUploadModal'
import { openCrispChat } from '@/components/shared/CrispChat'
import { compressImage } from '@/lib/image-utils'
import { selectClass } from '@/lib/form-styles'

// ── Types ─────────────────────────────────────────────────────────────────────

interface InspectionData {
  id: string
  status: string
  token: string
  tenantConfirmedAt: string | null
  hasPdf: boolean
}

interface PeriodicInspectionData {
  id: string
  status: string
  token: string
  inspectionNumber: number
  scheduledDate: string | null
  tenantConfirmedAt: string | null
  noticeSeenAt: string | null
  hasPdf: boolean
}

interface Props {
  tenant: { id: string; name: string; email: string; status: string; onboardingState: Record<string, boolean> | null }
  property: { id: string; address: string; landlordName: string; landlordEmail: string }
  inspection: InspectionData | null
  periodicInspections: PeriodicInspectionData[]
}

interface TenantDocument {
  id: string
  documentType: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  expiryDate: string | null
}

const TENANT_DOC_TYPE_LABELS: Record<string, string> = {
  RIGHT_TO_RENT: 'Right to Rent',
  PASSPORT: 'Passport',
  PROOF_OF_INCOME: 'Proof of Income',
  BANK_STATEMENTS: 'Bank Statements',
  EMPLOYER_REFERENCE: 'Employer Reference',
  PREVIOUS_LANDLORD_REFERENCE: 'Previous Landlord Reference',
  GUARANTOR_AGREEMENT: 'Guarantor Agreement',
  PET_AGREEMENT: 'Pet Agreement',
  OTHER: 'Other',
}

const TENANT_DOC_TYPES = Object.entries(TENANT_DOC_TYPE_LABELS).map(([value, label]) => ({ value, label }))

interface PropertyDocument {
  id: string
  documentType: string
  fileName: string
  mimeType: string
  fileSize: number
  uploadedAt: string
  expiryDate: string | null
  acknowledgments: Array<{ acknowledgedAt: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  GAS_SAFETY: 'Gas Safety Certificate',
  EPC: 'EPC',
  EICR: 'EICR',
  HOW_TO_RENT: 'How to Rent Guide',
  TENANCY_AGREEMENT: 'Tenancy Agreement',
  INVENTORY_REPORT: 'Inventory Report',
  DEPOSIT_CERTIFICATE: 'Deposit Certificate',
  RIGHT_TO_RENT: 'Right to Rent',
  BUILDING_INSURANCE: 'Building Insurance',
  LANDLORD_INSURANCE: 'Landlord Insurance',
  SECTION_13_NOTICE: 'Section 13 Notice',
  SECTION_8_NOTICE: 'Section 8 Notice',
  CHECKOUT_INVENTORY: 'Check-out Inventory',
  OTHER: 'Other',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') {
    return (
      <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    )
  }
  if (mimeType.startsWith('image/')) {
    return (
      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return (
      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  )
}

// ── Onboarding checklist ──────────────────────────────────────────────────────

const ONBOARDING_STEPS: Array<{ key: string; label: string; comingSoon?: boolean }> = [
  { key: 'rightToRent', label: 'Upload Right to Rent documents' },
  { key: 'deposit', label: 'Deposit protection' },
  { key: 'rentSetup', label: 'Rent payment setup' },
  { key: 'tenancyAgreement', label: 'Tenancy agreement' },
]

function OnboardingChecklist({ state }: { state: Record<string, boolean> | null }) {
  const steps = ONBOARDING_STEPS.map((step) => ({
    ...step,
    done: state?.[step.key] ?? false,
  }))
  const doneCount = steps.filter((s) => s.done).length
  const total = steps.length
  const pct = Math.round((doneCount / total) * 100)

  // Hide checklist if all steps done
  if (doneCount === total) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-gray-900 font-semibold">Getting started</h2>
          <p className="text-gray-400 text-xs">{doneCount} of {total} complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2.5">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-3">
            {step.done ? (
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />
            )}
            <span className={`text-sm ${step.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {step.label}
            </span>
            {step.comingSoon && !step.done && (
              <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-medium">
                Coming soon
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Documents section ─────────────────────────────────────────────────────────

function DocumentsSection({ propertyId }: { propertyId: string }) {
  const [docs, setDocs] = useState<PropertyDocument[]>([])
  const [loading, setLoading] = useState(true)
  // Track locally acknowledged doc IDs + date for optimistic updates
  const [localAcks, setLocalAcks] = useState<Record<string, string>>({})

  const loadDocs = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/documents?propertyId=${propertyId}`)
    const json = await res.json()
    if (json.data) setDocs(json.data)
    setLoading(false)
  }, [propertyId])

  useEffect(() => { loadDocs() }, [loadDocs])

  async function acknowledge(docId: string) {
    // Optimistic
    const now = new Date().toISOString()
    setLocalAcks((prev) => ({ ...prev, [docId]: now }))
    await fetch(`/api/documents/${docId}/acknowledge`, { method: 'POST' })
  }

  async function downloadDoc(docId: string, fileName: string) {
    const res = await fetch(`/api/documents/${docId}`)
    const json = await res.json()
    if (json.data?.signedUrl) {
      const a = document.createElement('a')
      a.href = json.data.signedUrl
      a.download = fileName
      a.target = '_blank'
      a.click()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (docs.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-4">No documents have been shared yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      {docs.map((doc) => {
        const serverAck = doc.acknowledgments[0]
        const localAck = localAcks[doc.id]
        const ackedAt = serverAck?.acknowledgedAt ?? localAck
        const isAcked = !!ackedAt

        return (
          <div key={doc.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
            <FileIcon mimeType={doc.mimeType} />
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-medium truncate">{doc.fileName}</p>
              <p className="text-gray-500 text-xs">{DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
              <p className="text-gray-400 text-xs">{formatBytes(doc.fileSize)}</p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => downloadDoc(doc.id, doc.fileName)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                title="Download"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {isAcked ? (
                <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Reviewed {formatDate(ackedAt)}
                </div>
              ) : (
                <button
                  onClick={() => acknowledge(doc.id)}
                  className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
                >
                  Mark as reviewed
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Rent payments (tenant read-only) ─────────────────────────────────────────

interface TenantPayment {
  id: string
  amount: number
  dueDate: string
  receivedDate: string | null
  receivedAmount: number | null
  status: 'PENDING' | 'EXPECTED' | 'RECEIVED' | 'LATE' | 'PARTIAL'
}

const TENANT_PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Upcoming', cls: 'bg-gray-100 text-gray-500' },
  EXPECTED: { label: 'Due today', cls: 'bg-blue-100 text-blue-600' },
  RECEIVED: { label: 'Received', cls: 'bg-green-100 text-green-700' },
  LATE:     { label: 'Late', cls: 'bg-red-100 text-red-600' },
  PARTIAL:  { label: 'Partial', cls: 'bg-orange-100 text-orange-600' },
}

function TenantPaymentBadge({ status }: { status: string }) {
  const cfg = TENANT_PAYMENT_STATUS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
}

function formatGBP(pence: number): string {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function tenantMonthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function TenantPaymentsSection({ propertyId }: { propertyId: string }) {
  const [payments, setPayments] = useState<TenantPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    fetch(`/api/payments?propertyId=${propertyId}`)
      .then((r) => r.json())
      .then((json) => { if (json.data) setPayments(json.data) })
      .finally(() => setLoading(false))
  }, [propertyId])

  const upcoming = payments.filter((p) => !['RECEIVED', 'PARTIAL'].includes(p.status))
  const history  = payments.filter((p) =>  ['RECEIVED', 'PARTIAL'].includes(p.status))

  const tooltipText = "Payment tracking is currently manual. Open Banking is coming soon — your payments will be confirmed automatically once you connect your bank."

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-gray-900 font-semibold">Rent Payments</h2>
        {/* Tooltip */}
        <span className="relative group inline-flex items-center ml-auto">
          <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold flex items-center justify-center cursor-help select-none">i</span>
          <span className="pointer-events-none absolute right-5 top-0 z-20 hidden group-hover:block w-60 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 shadow-lg leading-relaxed whitespace-normal">
            {tooltipText}
          </span>
        </span>
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && payments.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">No payment records yet.</p>
      )}

      {!loading && upcoming.length > 0 && (
        <div className="space-y-3 mb-4">
          {[...upcoming].reverse().map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <div>
                <p className="text-gray-800 text-sm font-medium">{tenantMonthLabel(p.dueDate)}</p>
                <p className="text-gray-400 text-xs">Due {formatDate(p.dueDate)} · {formatGBP(p.amount)}</p>
                {p.status === 'LATE' && (
                  <p className="text-amber-600 text-xs mt-0.5">
                    This payment appears overdue — please contact your landlord if you&apos;ve already paid.
                  </p>
                )}
              </div>
              <TenantPaymentBadge status={p.status} />
            </div>
          ))}
        </div>
      )}

      {!loading && history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showHistory ? 'Hide' : 'Show'} payment history ({history.length})
          </button>

          {showHistory && (
            <div className="space-y-3 border-t border-gray-100 pt-3">
              {history.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-gray-600 text-sm">{tenantMonthLabel(p.dueDate)}</p>
                    <p className="text-gray-400 text-xs">
                      Due {formatDate(p.dueDate)} ·{' '}
                      {p.status === 'PARTIAL' && p.receivedAmount ? formatGBP(p.receivedAmount) : formatGBP(p.amount)}
                      {p.receivedDate && ` · Received ${formatDate(p.receivedDate)}`}
                    </p>
                  </div>
                  <TenantPaymentBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Expiry helpers for tenant documents ──────────────────────────────────────

type TenantDocExpiryStatus = 'none' | 'valid' | 'expiring' | 'expiring-soon' | 'expired'

function calcExpiryStatus(expiryDate: string | null): TenantDocExpiryStatus {
  if (!expiryDate) return 'none'
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= 7) return 'expiring-soon'
  if (days <= 30) return 'expiring'
  return 'valid'
}

function calcExpiryDays(expiryDate: string): number {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000)
}

function tenantDocRowStyle(status: TenantDocExpiryStatus) {
  switch (status) {
    case 'expired':       return { background: 'rgba(220,38,38,0.1)',  borderLeft: '4px solid rgb(220,38,38)' }
    case 'expiring-soon': return { background: 'rgba(234,88,12,0.1)',  borderLeft: '4px solid rgb(234,88,12)' }
    case 'expiring':      return { background: 'rgba(245,158,11,0.1)', borderLeft: '4px solid rgb(245,158,11)' }
    default:              return {}
  }
}

function TenantDocExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null
  const status = calcExpiryStatus(expiryDate)
  if (status === 'valid' || status === 'none') return null
  const days = calcExpiryDays(expiryDate)
  if (status === 'expired') {
    const abs = Math.abs(days)
    return (
      <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
        Expired {abs} day{abs !== 1 ? 's' : ''} ago
      </span>
    )
  }
  if (status === 'expiring-soon') {
    return (
      <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
        Expires in {days} day{days !== 1 ? 's' : ''}
      </span>
    )
  }
  return (
    <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
      Expires in {days} day{days !== 1 ? 's' : ''}
    </span>
  )
}

// ── My Documents section ──────────────────────────────────────────────────────

function MyDocumentsSection({ tenantId }: { tenantId: string }) {
  const [docs, setDocs] = useState<TenantDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadPreselectedType, setUploadPreselectedType] = useState<string | undefined>(undefined)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/tenant-documents?tenantId=${tenantId}`)
    const json = await res.json()
    if (json.data) setDocs(json.data)
    setLoading(false)
  }, [tenantId])

  useEffect(() => { loadDocs() }, [loadDocs])

  async function downloadDoc(docId: string, fileName: string) {
    const res = await fetch(`/api/tenant-documents/${docId}`)
    const json = await res.json()
    if (json.data?.signedUrl) {
      const a = document.createElement('a')
      a.href = json.data.signedUrl
      a.download = fileName
      a.target = '_blank'
      a.click()
    }
  }

  function openUploadForType(docType: string) {
    setUploadPreselectedType(docType)
    setShowUpload(true)
  }

  // Banner counts
  const expiredCount      = docs.filter(d => calcExpiryStatus(d.expiryDate) === 'expired').length
  const expiringSoonCount = docs.filter(d => calcExpiryStatus(d.expiryDate) === 'expiring-soon').length
  const expiringCount     = docs.filter(d => calcExpiryStatus(d.expiryDate) === 'expiring').length

  let bannerMsg = ''
  let bannerCls = ''
  if (!bannerDismissed) {
    if (expiredCount > 0) {
      bannerMsg = `⚠️ ${expiredCount} document${expiredCount > 1 ? 's' : ''} ${expiredCount > 1 ? 'have' : 'has'} expired and need to be updated.`
      bannerCls = 'bg-red-50 border-red-200 text-red-700'
    } else if (expiringSoonCount > 0) {
      bannerMsg = `⚠️ ${expiringSoonCount} document${expiringSoonCount > 1 ? 's' : ''} ${expiringSoonCount > 1 ? 'are' : 'is'} expiring very soon.`
      bannerCls = 'bg-orange-50 border-orange-200 text-orange-700'
    } else if (expiringCount > 0) {
      bannerMsg = `⚠️ ${expiringCount} document${expiringCount > 1 ? 's' : ''} ${expiringCount > 1 ? 'are' : 'is'} expiring soon.`
      bannerCls = 'bg-amber-50 border-amber-200 text-amber-700'
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-gray-900 font-semibold flex-1">My Documents</h2>
        <button
          onClick={() => { setUploadPreselectedType(undefined); setShowUpload(true) }}
          className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
      </div>

      {bannerMsg && (
        <div className={`mb-3 flex items-start gap-2 p-3 border rounded-xl text-sm ${bannerCls}`}>
          <span className="flex-1">{bannerMsg}</span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="opacity-60 hover:opacity-100 shrink-0 text-base leading-none font-medium"
          >✕</button>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-3">
        Landlords typically ask for: proof of ID (passport or driving licence), Right to Rent document, proof of income, and references. If your landlord has specific requirements, they&apos;ll let you know.
      </p>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
          <button
            onClick={() => { setUploadPreselectedType(undefined); setShowUpload(true) }}
            className="mt-2 text-sm text-green-600 hover:text-green-700 transition-colors"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const expStatus = calcExpiryStatus(doc.expiryDate)
            const needsAttention = expStatus === 'expired' || expStatus === 'expiring-soon' || expStatus === 'expiring'
            const tooltipText = expStatus === 'expiring-soon'
              ? 'Your document expires very soon. Please upload a replacement urgently.'
              : expStatus === 'expiring'
              ? 'Your document will expire soon. Consider uploading a replacement.'
              : ''
            return (
              <div
                key={doc.id}
                className={`flex items-start gap-3 p-3 rounded-xl border border-gray-100${expStatus === 'none' || expStatus === 'valid' ? ' bg-gray-50' : ''}`}
                style={tenantDocRowStyle(expStatus)}
              >
                <FileIcon mimeType={doc.mimeType} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-gray-900 text-sm font-medium truncate">{doc.fileName}</p>
                    <TenantDocExpiryBadge expiryDate={doc.expiryDate} />
                  </div>
                  <p className="text-gray-500 text-xs">{TENANT_DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
                  <p className="text-gray-400 text-xs">{formatBytes(doc.fileSize)}</p>
                  {expStatus === 'expired' && (
                    <p className="text-red-600 text-xs mt-1">This document has expired. Please upload a new one.</p>
                  )}
                  {(expStatus === 'expiring-soon' || expStatus === 'expiring') && (
                    <p className="text-gray-500 text-xs mt-1 sm:hidden">{tooltipText}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => downloadDoc(doc.id, doc.fileName)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  {(expStatus === 'expiring-soon' || expStatus === 'expiring') && (
                    <span className="relative group hidden sm:inline-flex items-center">
                      <span className={`w-4 h-4 rounded-full ${expStatus === 'expiring-soon' ? 'bg-orange-100 text-orange-500' : 'bg-amber-100 text-amber-500'} text-[10px] font-bold flex items-center justify-center cursor-help select-none`}>!</span>
                      <span className="pointer-events-none absolute right-6 top-0 z-20 hidden group-hover:block w-52 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 shadow-lg leading-relaxed whitespace-normal">
                        {tooltipText}
                      </span>
                    </span>
                  )}
                  {needsAttention && (
                    <button
                      onClick={() => openUploadForType(doc.documentType)}
                      className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 bg-white px-2 py-1 rounded-lg transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Update
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DocumentUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={loadDocs}
        uploadEndpoint="/api/tenant-documents/upload"
        extraFields={{ tenantId }}
        documentTypes={TENANT_DOC_TYPES}
        expiryDateTypes={['RIGHT_TO_RENT', 'PASSPORT']}
        preselectedType={uploadPreselectedType}
        title="Upload Your Document"
      />
    </div>
  )
}

// ── Contract section ──────────────────────────────────────────────────────────

interface ContractData {
  status: string
  contractType: string
  tenantSignedAt: string | null
  landlordSignedAt: string | null
  signingToken: string
  hasPdf: boolean
}

function ContractSection() {
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tenant/contract')
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.status) setContract(json.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-gray-900 font-semibold">Tenancy Agreement</h2>
        </div>
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // State A: no contract
  if (!contract) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-gray-900 font-semibold">Tenancy Agreement</h2>
        </div>
        <p className="text-sm text-gray-500">
          Your landlord hasn&apos;t sent a tenancy agreement yet.
        </p>
      </div>
    )
  }

  const needsTenantSignature =
    !contract.tenantSignedAt &&
    (contract.status === 'PENDING_SIGNATURES' || contract.status === 'LANDLORD_SIGNED')

  const tenantSignedWaiting =
    !!contract.tenantSignedAt && contract.status === 'TENANT_SIGNED'

  const fullySigned = contract.status === 'BOTH_SIGNED'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-gray-900 font-semibold">Tenancy Agreement</h2>
      </div>

      {/* State B: needs tenant signature */}
      {needsTenantSignature && (
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              Your signature is required
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Your landlord has sent a tenancy agreement for you to sign.
            </p>
            <a
              href={`/sign/contract/${contract.signingToken}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-900 transition-colors"
            >
              Review and sign →
            </a>
          </div>
        </div>
      )}

      {/* State C: fully signed */}
      {fullySigned && (
        <div>
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Agreement signed by both parties</span>
          </div>
          {contract.hasPdf && (
            <button
              onClick={async () => {
                const r = await fetch('/api/tenant/contract/pdf-url')
                const { url } = await r.json()
                if (url) window.open(url, '_blank')
              }}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
          )}
        </div>
      )}

      {/* State D: tenant signed, waiting for landlord */}
      {tenantSignedWaiting && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>You&apos;ve signed — waiting for your landlord&apos;s signature.</span>
        </div>
      )}
    </div>
  )
}

// ── Check-in Inspection section ───────────────────────────────────────────────

function InspectionSection({ report }: { report: InspectionData }) {
  // Don't show card until landlord sends it for review
  if (report.status === 'PENDING' || report.status === 'DRAFT') return null

  const needsReview = report.status === 'IN_REVIEW' && !report.tenantConfirmedAt
  const tenantConfirmed = report.status === 'IN_REVIEW' && !!report.tenantConfirmedAt
  const isDisputed = report.status === 'DISPUTED'
  const isAgreed = report.status === 'AGREED'

  const indicatorCls = isAgreed
    ? 'bg-green-400'
    : isDisputed
    ? 'bg-red-400'
    : 'bg-amber-400'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-gray-900 font-semibold">Check-in Inspection</h2>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${indicatorCls}`} />
        <div className="flex-1 min-w-0">
          {needsReview && (
            <>
              <p className="text-gray-900 text-sm font-medium">Review your inspection report</p>
              <p className="text-gray-500 text-sm mt-1">
                Your landlord has completed the property inspection. Please review the photos and confirm the condition of the property.
              </p>
              <Link
                href={`/tenant/inspection/${report.token}`}
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Review &amp; confirm
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          )}

          {tenantConfirmed && (
            <>
              <p className="text-gray-900 text-sm font-medium">Confirmation submitted</p>
              <p className="text-gray-500 text-sm mt-1">
                You&apos;ve confirmed the property condition. Waiting for your landlord to finalise.
              </p>
            </>
          )}

          {isDisputed && (
            <>
              <p className="text-gray-900 text-sm font-medium">Inspection disputed</p>
              <p className="text-gray-500 text-sm mt-1">
                You raised a concern with this inspection report. Your landlord has been notified.
              </p>
            </>
          )}

          {isAgreed && (
            <>
              <p className="text-gray-900 text-sm font-medium">Inspection complete</p>
              <p className="text-gray-500 text-sm mt-1">
                Both parties have confirmed the property condition. Your inspection report has been saved.
              </p>
              {report.hasPdf && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/tenant/inspections/${report.id}/pdf-url`)
                      const json = await res.json()
                      if (json.url) window.open(json.url, '_blank')
                    } catch { /* ignore */ }
                  }}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download report
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Periodic Inspections section ───────────────────────────────────────────────

function PeriodicInspectionsSection({ inspections }: { inspections: PeriodicInspectionData[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h2 className="text-gray-900 font-semibold">Periodic Inspections</h2>
      </div>

      <div className="space-y-3">
        {inspections.map((insp) => {
          const isPending = insp.status === 'PENDING' || insp.status === 'IN_REVIEW'
          const isAgreed = insp.status === 'AGREED'
          const needsAcknowledge = isPending && !insp.noticeSeenAt

          return (
            <div key={insp.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    #{insp.inspectionNumber}
                  </span>
                  {insp.scheduledDate && (
                    <span className="text-xs text-gray-500">{formatDate(insp.scheduledDate)}</span>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isAgreed ? 'bg-green-100 text-green-700'
                  : insp.status === 'DISPUTED' ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
                }`}>
                  {insp.status === 'IN_REVIEW' ? 'In Review' : insp.status.charAt(0) + insp.status.slice(1).toLowerCase()}
                </span>
              </div>

              {needsAcknowledge && (
                <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-amber-800 text-sm font-medium">Notice received</p>
                  <p className="text-amber-700 text-xs mt-0.5">
                    Your landlord has given notice to inspect the property. Please acknowledge receipt.
                  </p>
                  <Link
                    href={`/tenant/inspection/${insp.token}?acknowledge=true`}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-amber-800 hover:text-amber-900 font-medium transition-colors"
                  >
                    Acknowledge &amp; review
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}

              {isPending && !needsAcknowledge && (
                <Link
                  href={`/tenant/inspection/${insp.token}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Review &amp; confirm
                </Link>
              )}

              {isAgreed && (
                <div>
                  <p className="text-gray-500 text-sm">
                    Confirmed{insp.tenantConfirmedAt ? ` on ${formatDate(insp.tenantConfirmedAt)}` : ''}.
                  </p>
                  {insp.hasPdf && (
                    <Link
                      href={`/tenant/inspection/${insp.token}`}
                      className="inline-flex items-center gap-1.5 mt-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                    >
                      View report
                    </Link>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Maintenance request types ─────────────────────────────────────────────────

interface TenantMaintenanceRequest {
  id: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  createdAt: string
  updatedAt: string
}

interface MaintStatusHistory {
  id: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
  note: string | null
}

interface MaintPhoto {
  id: string
  role: string
  signedUrl: string | null
  caption: string | null
  uploadedAt: string
}

interface RequestDetail {
  statusHistory: MaintStatusHistory[]
  photos: MaintPhoto[]
}

const MAINT_STATUS_CLS: Record<string, string> = {
  OPEN:        'bg-blue-100 text-blue-600',
  IN_PROGRESS: 'bg-amber-100 text-amber-600',
  RESOLVED:    'bg-green-100 text-green-700',
}

const MAINT_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved',
}

const MAINT_TIMELINE_DOT: Record<string, string> = {
  OPEN:        'bg-blue-400',
  IN_PROGRESS: 'bg-amber-400',
  RESOLVED:    'bg-green-500',
}

const PRIORITY_OPTIONS: Array<{ value: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; label: string; hint: string }> = [
  { value: 'LOW',    label: 'Low',    hint: 'Not urgent, minor issue' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Needs attention soon' },
  { value: 'HIGH',   label: 'High',   hint: 'Significant issue' },
  { value: 'URGENT', label: 'Urgent', hint: 'Safety concern or emergency' },
]

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_PHOTOS = 10

// ── Tenant Maintenance section ────────────────────────────────────────────────

function TenantMaintenanceSection({
  tenantId,
  propertyId,
}: {
  tenantId: string
  propertyId: string
}) {
  const [requests, setRequests] = useState<TenantMaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')

  // Photo upload state
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [pendingPhotos, setPendingPhotos] = useState<Array<{ file: File; preview: string; caption: string }>>([])

  // Expanded detail state (Part 7)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, RequestDetail>>({})

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/maintenance?tenantId=${tenantId}`)
    const json = await res.json()
    if (json.data) setRequests(json.data)
    setLoading(false)
  }, [tenantId])

  useEffect(() => { loadRequests() }, [loadRequests])

  async function loadDetail(id: string) {
    if (detailCache[id] || loadingDetail === id) return
    setLoadingDetail(id)
    const [detailRes, photosRes] = await Promise.all([
      fetch(`/api/maintenance/${id}`),
      fetch(`/api/maintenance/${id}/photos`),
    ])
    const [detailJson, photosJson] = await Promise.all([detailRes.json(), photosRes.json()])
    setDetailCache((prev) => ({
      ...prev,
      [id]: {
        statusHistory: detailJson.data?.statusHistory ?? [],
        photos: photosJson.data ?? [],
      },
    }))
    setLoadingDetail(null)
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      loadDetail(id)
    }
  }

  // Photo handlers
  function addFiles(files: FileList | null) {
    if (!files) return
    const valid: Array<{ file: File; preview: string; caption: string }> = []
    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) continue
      if (file.size > MAX_PHOTO_SIZE) continue
      if (pendingPhotos.length + valid.length >= MAX_PHOTOS) break
      valid.push({ file, preview: URL.createObjectURL(file), caption: '' })
    }
    setPendingPhotos((prev) => [...prev, ...valid])
  }

  function removePhoto(i: number) {
    setPendingPhotos((prev) => {
      URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  function updateCaption(i: number, caption: string) {
    setPendingPhotos((prev) => prev.map((p, idx) => idx === i ? { ...p, caption } : p))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }

  async function submit() {
    if (!title.trim() || !description.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, tenantId, title, description, priority }),
    })
    if (!res.ok) { setSubmitting(false); return }
    const json = await res.json()
    const reqId: string = json.data?.id

    // Upload photos sequentially (compressed before upload)
    if (reqId && pendingPhotos.length > 0) {
      setSubmitting(false)
      setUploadingPhotos(true)
      for (const p of pendingPhotos) {
        const compressed = await compressImage(p.file)
        const fd = new FormData()
        fd.append('file', compressed)
        fd.append('role', 'TENANT')
        if (p.caption) fd.append('caption', p.caption)
        await fetch(`/api/maintenance/${reqId}/photos`, { method: 'POST', body: fd }).catch(console.error)
      }
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.preview))
      setPendingPhotos([])
      setUploadingPhotos(false)
    } else {
      setSubmitting(false)
    }

    setSubmitSuccess(true)
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    await loadRequests()
    setTimeout(() => { setSubmitSuccess(false); setShowModal(false) }, 2000)
  }

  function openModal() {
    setPendingPhotos([])
    setSubmitSuccess(false)
    setShowModal(true)
  }

  function closeModal() {
    pendingPhotos.forEach((p) => URL.revokeObjectURL(p.preview))
    setPendingPhotos([])
    setShowModal(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="text-gray-900 font-semibold flex-1">Maintenance Requests</h2>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New request
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm">No maintenance requests yet.</p>
          <button
            onClick={openModal}
            className="mt-2 text-sm text-green-600 hover:text-green-700 transition-colors"
          >
            Submit your first request
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const isExpanded = expandedId === req.id
            const isLoadingThis = loadingDetail === req.id
            const detail = detailCache[req.id]
            return (
              <div key={req.id} className="rounded-xl border border-gray-100 overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => toggleExpand(req.id)}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-gray-900 text-sm font-medium">{req.title}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MAINT_STATUS_CLS[req.status]}`}>
                        {MAINT_STATUS_LABEL[req.status]}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Updated {new Date(req.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-3 bg-white">
                    {isLoadingThis ? (
                      <div className="flex justify-center py-3">
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : detail ? (
                      <div className="space-y-4">
                        <p className="text-gray-600 text-sm">{req.description}</p>

                        {/* Status timeline */}
                        {detail.statusHistory.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Status history</p>
                            <div className="space-y-2">
                              {detail.statusHistory.map((h) => (
                                <div key={h.id} className="flex gap-2.5 items-start">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${MAINT_TIMELINE_DOT[h.toStatus] ?? 'bg-gray-400'}`} />
                                  <div>
                                    <p className="text-xs text-gray-700 font-medium">{MAINT_STATUS_LABEL[h.toStatus] ?? h.toStatus}</p>
                                    <p className="text-gray-400 text-xs">
                                      {new Date(h.changedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    {h.note && <p className="text-gray-500 text-xs mt-0.5 italic">&ldquo;{h.note}&rdquo;</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tenant photos */}
                        {detail.photos.filter(p => p.role === 'TENANT').length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Your photos</p>
                            <div className="grid grid-cols-3 gap-2">
                              {detail.photos.filter(p => p.role === 'TENANT').map((photo) => (
                                <div key={photo.id}>
                                  {photo.signedUrl ? (
                                    <button type="button" onClick={() => setLightboxSrc(photo.signedUrl)} className="cursor-zoom-in">
                                      <img src={photo.signedUrl} alt={photo.caption ?? ''} className="w-full aspect-square object-cover rounded-lg" />
                                    </button>
                                  ) : (
                                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  {photo.caption && <p className="text-gray-400 text-xs mt-1 truncate">{photo.caption}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Landlord proof photos (RESOLVED only) */}
                        {req.status === 'RESOLVED' && detail.photos.filter(p => p.role === 'LANDLORD').length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Resolved — proof photos</p>
                            <div className="grid grid-cols-3 gap-2">
                              {detail.photos.filter(p => p.role === 'LANDLORD').map((photo) => (
                                <div key={photo.id}>
                                  {photo.signedUrl ? (
                                    <button type="button" onClick={() => setLightboxSrc(photo.signedUrl)} className="cursor-zoom-in">
                                      <img src={photo.signedUrl} alt={photo.caption ?? ''} className="w-full aspect-square object-cover rounded-lg" />
                                    </button>
                                  ) : (
                                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                      <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  {photo.caption && <p className="text-gray-400 text-xs mt-1 truncate">{photo.caption}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New request modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-semibold">New Maintenance Request</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {submitSuccess ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">Request submitted!</p>
                <p className="text-gray-400 text-sm mt-1">Your landlord has been notified.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Boiler not heating water"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className={selectClass}
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label} — {o.hint}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe the issue in detail..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-colors resize-none"
                  />
                </div>

                {/* Photo upload (Part 4) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add photos <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => photoInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Drop photos here or click to select</p>
                    <p className="text-gray-300 text-xs mt-0.5">JPEG, PNG, WebP · max 10MB · up to {MAX_PHOTOS} photos</p>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      hidden
                      onChange={(e) => addFiles(e.target.files)}
                    />
                  </div>
                  {pendingPhotos.length > 0 && (
                    <>
                      <p className="text-gray-400 text-xs mt-1.5">Photos help your landlord understand the issue faster.</p>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {pendingPhotos.map((p, i) => (
                          <div key={i} className="relative group">
                            <div className="relative aspect-square">
                              <img src={p.preview} alt="" className="w-full h-full object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removePhoto(i) }}
                                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                              >
                                ✕
                              </button>
                            </div>
                            <input
                              type="text"
                              value={p.caption}
                              onChange={(e) => updateCaption(i, e.target.value)}
                              placeholder="Caption…"
                              className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500/40"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={submit}
                    disabled={submitting || uploadingPhotos || !title.trim() || !description.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors text-sm"
                  >
                    {submitting ? 'Submitting…' : uploadingPhotos ? 'Uploading photos…' : 'Submit request'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo lightbox */}
      {lightboxSrc && (
        <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  )
}

function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Photo full view" className="max-h-[85vh] mx-auto rounded-xl object-contain w-full" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TenantDashboardClient({ tenant, property, inspection, periodicInspections }: Props) {
  // Identify tenant to Crisp (widget loaded by tenant layout)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.$crisp) return
    window.$crisp.push(['set', 'user:email', [tenant.email]])
    window.$crisp.push(['set', 'user:nickname', [tenant.name]])
    window.$crisp.push([
      'set',
      'session:data',
      [[
        ['role', 'tenant'],
        ['tenantId', tenant.id],
      ]],
    ])
  }, [tenant])

  async function signOut() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-[#f0f7f4]">

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-[#f0f7f4]/90 backdrop-blur-sm border-b border-green-200/60 px-4 h-14 flex items-center justify-between">
        <Image src="/logo.svg" alt="LetSorted" width={110} height={37} />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">My Rental</span>
          <Link
            href="/dashboard?as=landlord"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 transition-colors border border-green-300/60 rounded-md px-2 py-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            </svg>
            Landlord account
          </Link>
          <button
            onClick={openCrispChat}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-green-700 hover:bg-green-100/60 transition-all duration-150"
            title="Chat with support"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
          </button>
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

        <div className="space-y-4">
          {/* Onboarding checklist */}
          {tenant.status === 'INVITED' && (
            <OnboardingChecklist state={tenant.onboardingState} />
          )}

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-gray-900 font-semibold">Property Documents</h2>
            </div>
            <DocumentsSection propertyId={property.id} />
          </div>

          {/* My Documents */}
          <MyDocumentsSection tenantId={tenant.id} />

          {/* Tenancy Agreement */}
          <ContractSection />

          {/* Move-in Inspection */}
          {inspection && <InspectionSection report={inspection} />}

          {/* Periodic Inspections */}
          {periodicInspections.length > 0 && (
            <PeriodicInspectionsSection inspections={periodicInspections} />
          )}

          {/* Rent payments */}
          <TenantPaymentsSection propertyId={property.id} />

          {/* Maintenance requests */}
          <TenantMaintenanceSection tenantId={tenant.id} propertyId={property.id} />
        </div>
      </main>
    </div>
  )
}
