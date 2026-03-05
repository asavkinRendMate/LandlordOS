'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import DocumentUploadModal from '@/components/shared/DocumentUploadModal'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  tenant: { id: string; name: string; email: string }
  property: { id: string; address: string; landlordName: string; landlordEmail: string }
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

// ── My Documents section ──────────────────────────────────────────────────────

function MyDocumentsSection({ tenantId }: { tenantId: string }) {
  const [docs, setDocs] = useState<TenantDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

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
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm">No documents uploaded yet.</p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-2 text-sm text-green-600 hover:text-green-700 transition-colors"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
              <FileIcon mimeType={doc.mimeType} />
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium truncate">{doc.fileName}</p>
                <p className="text-gray-500 text-xs">{TENANT_DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
                <p className="text-gray-400 text-xs">{formatBytes(doc.fileSize)}</p>
              </div>
              <button
                onClick={() => downloadDoc(doc.id, doc.fileName)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                title="Download"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          ))}
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
        title="Upload Your Document"
      />
    </div>
  )
}

// ── Placeholder section ───────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

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
          {/* Documents */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-gray-900 font-semibold">Documents</h2>
            </div>
            <DocumentsSection propertyId={property.id} />
          </div>

          {/* My Documents */}
          <MyDocumentsSection tenantId={tenant.id} />

          {/* Rent payments */}
          <TenantPaymentsSection propertyId={property.id} />

          {/* Maintenance placeholder */}
          <PlaceholderSection
            title="Maintenance requests"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>
      </main>
    </div>
  )
}
