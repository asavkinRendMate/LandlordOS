'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DocumentUploadModal from '@/components/shared/DocumentUploadModal'
import DeletePropertyModal from '@/components/properties/DeletePropertyModal'
import SectionHelpModal, { SectionHelpButton, type SectionHelpKey } from '@/components/properties/SectionHelpModal'
import TenantDetailsForm, { type TenantFormData } from '@/components/shared/TenantDetailsForm'
import { type RoomEntry, ROOM_TYPE_LABELS, QUICK_ADD_ROOMS } from '@/lib/room-utils'
import { inputClass, selectClassCompact } from '@/lib/form-styles'
import { showErrorToast } from '@/lib/error-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatementFile {
  index: number
  fileName: string
  storagePath: string
  fileSize: number
  verificationStatus: 'PENDING' | 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN'
  detectedName?: string | null
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  reason?: string
  relationship?: string | null
  removedByApplicant?: boolean
}

interface JointApplicant {
  name: string
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN'
  income?: number | null
  fileIndices: number[]
  relationship?: string
}

interface PersonValidation {
  name: string
  isApplicant: boolean
  fileIndices: number[]
  periodStart: string | null
  periodEnd: string | null
  coverageDays: number | null
  coverageStatus: 'PASS' | 'WARN_SHORT' | 'WARN_OLD' | 'WARN_BOTH' | 'UNKNOWN'
}

interface FinancialReport {
  id: string
  inviteId: string | null
  status: string
  totalScore: number | null
  grade: string | null
  aiSummary: string | null
  breakdown: Record<string, number> | null
  appliedRules: Array<{ key: string; description: string; points: number }> | null
  verificationToken: string
  hasUnverifiedFiles?: boolean
  statementFiles?: StatementFile[] | null
  verificationWarning?: string | null
  applicantName?: string | null
  jointApplicants?: JointApplicant[] | null
  validationResults?: PersonValidation[] | null
  failureReason?: string | null
}

interface PropertyRoom {
  id: string
  type: string
  name: string
  floor: number | null
  order: number
}

interface ApplicationInvite {
  id: string
  email: string
  sentAt: string
}

interface Property {
  id: string
  name: string | null
  line1: string
  line2: string | null
  city: string
  postcode: string
  status: string
  type: string
  bedrooms: number | null
  requireFinancialVerification: boolean
  tenants: Tenant[]
  complianceDocs: ComplianceDoc[]
  tenancies: Tenancy[]
  rooms: PropertyRoom[]
  applicationInvites: ApplicationInvite[]
}

interface Tenant {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  inviteToken: string
  documents: { documentType: string; expiryDate: string | null }[]
  financialReports: FinancialReport[]
}

interface ComplianceDoc {
  type: string
  status: string
  expiryDate: string | null
  issued: boolean
}

interface Tenancy {
  monthlyRent: number | null
  startDate: string | null
  status: string
}

interface PropertyDocument {
  id: string
  documentType: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  expiryDate: string | null
  acknowledgments: Array<{
    acknowledgedAt: string
    tenant: { name: string }
  }>
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


const TENANT_STRIP_TYPES = ['RIGHT_TO_RENT', 'PASSPORT', 'PROOF_OF_INCOME', 'BANK_STATEMENTS'] as const
const TENANT_STRIP_LABELS: Record<string, string> = {
  RIGHT_TO_RENT: 'Right to Rent',
  PASSPORT: 'Passport',
  PROOF_OF_INCOME: 'Proof of Income',
  BANK_STATEMENTS: 'Bank Statements',
}

function tenantDocStatus(
  docs: { documentType: string; expiryDate: string | null }[],
  type: string
): 'valid' | 'expiring' | 'expired' | 'missing' {
  const typeDocs = docs.filter((d) => d.documentType === type)
  if (typeDocs.length === 0) return 'missing'
  // Pick the doc with the latest expiry (no expiry = treat as Infinity)
  const best = [...typeDocs].sort((a, b) => {
    const tA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
    const tB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
    return tB - tA
  })[0]
  if (!best.expiryDate) return 'valid'
  const days = Math.ceil((new Date(best.expiryDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring'
  return 'valid'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  VACANT:           { label: 'Vacant',                cls: 'bg-gray-100 text-gray-500' },
  APPLICATION_OPEN: { label: 'Accepting applications', cls: 'bg-blue-100 text-blue-700' },
  OFFER_ACCEPTED:   { label: 'Offer accepted',         cls: 'bg-yellow-100 text-yellow-800' },
  ACTIVE:           { label: 'Active',                 cls: 'bg-green-100 text-green-700' },
  NOTICE_GIVEN:     { label: 'Notice given',           cls: 'bg-orange-100 text-orange-700' },
}

const tenantStatusConfig: Record<string, { label: string; cls: string }> = {
  CANDIDATE:     { label: 'Applied',        cls: 'bg-blue-100 text-blue-700' },
  INVITED:       { label: 'Invited',        cls: 'bg-yellow-100 text-yellow-800' },
  TENANT:        { label: 'Active tenant',  cls: 'bg-green-100 text-green-700' },
  FORMER_TENANT: { label: 'Former tenant',  cls: 'bg-gray-100 text-gray-500' },
}

function StatusBadge({ status, config }: { status: string; config: typeof statusConfig }) {
  const c = config[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.cls}`}>{c.label}</span>
}

// ── File type icon ─────────────────────────────────────────────────────────────

function FileIcon({ mimeType, size = 'md' }: { mimeType: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-8 h-8' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  if (mimeType === 'application/pdf') {
    return (
      <svg className={`${sz} text-red-400 shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
  if (mimeType.startsWith('image/')) {
    return (
      <svg className={`${sz} text-blue-400 shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return (
      <svg className={`${sz} text-blue-400 shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
  return (
    <svg className={`${sz} text-gray-400 shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

// ── Expiry badge ───────────────────────────────────────────────────────────────

function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const d = new Date(expiryDate)
  const now = new Date()
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return <span className="text-xs text-red-600 font-medium">Expired {formatDate(expiryDate)}</span>
  if (daysLeft <= 30) return <span className="text-xs text-orange-600 font-medium">Expires {formatDate(expiryDate)}</span>
  return <span className="text-xs text-green-700 font-medium">Valid until {formatDate(expiryDate)}</span>
}

// ── Compliance status cards ────────────────────────────────────────────────────

function complianceStatusFromDocs(docs: PropertyDocument[], type: string): { label: string; cls: string } {
  const doc = docs.find((d) => d.documentType === type)
  if (!doc) return { label: 'Not uploaded', cls: 'bg-gray-100 text-gray-400' }
  if (type === 'HOW_TO_RENT') return { label: 'Issued', cls: 'bg-green-100 text-green-700' }
  if (!doc.expiryDate) return { label: 'Uploaded', cls: 'bg-green-100 text-green-700' }
  const daysLeft = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700' }
  if (daysLeft <= 30) return { label: 'Expiring soon', cls: 'bg-orange-100 text-orange-700' }
  return { label: 'Valid', cls: 'bg-green-100 text-green-700' }
}

const REQUIRED_DOC_ICONS: Record<string, React.ReactNode> = {
  GAS_SAFETY: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  EPC: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  EICR: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  ),
  HOW_TO_RENT: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
}


// ── Delete confirmation ────────────────────────────────────────────────────────

function DeleteDocButton({ docId, onDeleted }: { docId: string; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function del() {
    setDeleting(true)
    const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
    if (res.ok) onDeleted()
    else { setDeleting(false); setConfirm(false) }
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded"
        title="Delete document"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-[#6B7280]">Delete?</span>
      <button onClick={del} disabled={deleting} className="text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-50">
        {deleting ? '…' : 'Yes'}
      </button>
      <button onClick={() => setConfirm(false)} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">No</button>
    </div>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="text-sm bg-gray-100 hover:bg-gray-200 text-[#6B7280] hover:text-[#1A1A1A] px-3 py-1.5 rounded-lg transition-colors"
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

// ── Send invite button ────────────────────────────────────────────────────────

function SendInviteButton({ tenantId }: { tenantId: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  async function send() {
    setState('sending')
    const res = await fetch('/api/tenant/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    })
    setState(res.ok ? 'sent' : 'error')
    if (res.ok) setTimeout(() => setState('idle'), 3000)
  }
  return (
    <button
      onClick={send}
      disabled={state === 'sending'}
      className="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {state === 'sending' ? 'Sending…' : state === 'sent' ? '✓ Sent' : state === 'error' ? 'Error — retry' : 'Send invite email'}
    </button>
  )
}

// ── Multi-email input ─────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAILS = 10

function MultiEmailInput({
  emails,
  setEmails,
}: {
  emails: string[]
  setEmails: React.Dispatch<React.SetStateAction<string[]>>
}) {
  function handleChange(index: number, value: string) {
    setEmails((prev) => {
      const next = [...prev]
      next[index] = value
      // Auto-append empty field when last field becomes valid
      if (index === next.length - 1 && EMAIL_RE.test(value) && next.length < MAX_EMAILS) {
        next.push('')
      }
      return next
    })
  }

  function removeEmail(index: number) {
    setEmails((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // If the new last field is empty and so was the removed field's neighbor — trim trailing empties
      while (next.length > 1 && next[next.length - 1] === '' && next[next.length - 2] === '') {
        next.pop()
      }
      if (next.length === 0) next.push('')
      return next
    })
  }

  const atMax = emails.filter((e) => EMAIL_RE.test(e)).length >= MAX_EMAILS

  return (
    <div className="space-y-2">
      {emails.map((email, i) => (
        <div
          key={i}
          className="flex items-center gap-2 transition-opacity duration-150"
          style={{ opacity: email === '' && i === emails.length - 1 && i > 0 ? 0.7 : 1 }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder="applicant@email.com"
            className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[#1A1A1A] text-sm placeholder-gray-400 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors"
          />
          {i > 0 && (
            <button
              onClick={() => removeEmail(i)}
              className="shrink-0 p-1.5 text-gray-300 hover:text-red-400 transition-colors"
              title="Remove"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
      {atMax && (
        <p className="text-xs text-amber-600">Maximum 10 invites at once</p>
      )}
    </div>
  )
}

// ── Invite preview modal ──────────────────────────────────────────────────────

function InvitePreviewModal({
  emails,
  requiresFinancialCheck,
  propertyAddress,
  onConfirm,
  onClose,
  sending,
}: {
  emails: string[]
  requiresFinancialCheck: boolean
  propertyAddress: string
  onConfirm: () => void
  onClose: () => void
  sending: boolean
}) {
  const count = emails.length
  const s = count === 1 ? '' : 's'

  // Cost estimate
  const costPence = count > 0 ? 999 + (count - 1) * 149 : 0
  const costDisplay = `£${(costPence / 100).toFixed(2)}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-[#1A1A1A] font-semibold">Review before sending</h2>
            <p className="text-sm text-gray-500 mt-0.5">Sending to {count} applicant{s}</p>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Email preview */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Email preview</p>
            <div className="relative pointer-events-none opacity-60 select-none bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <span className="absolute top-3 right-3 bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded font-medium">Preview</span>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-[#2D6A4F] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">LS</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2D6A4F]">LetSorted</p>
                  <p className="text-[10px] text-gray-400">Applications</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2.5">
                <p className="text-sm text-gray-700">Hi,</p>
                <p className="text-sm text-gray-700">You&apos;ve been sent an application link for:</p>
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-3 py-2">
                  <p className="text-sm font-medium text-[#166534]">{propertyAddress}</p>
                </div>
                <p className="text-sm text-gray-700">Click below to submit your application:</p>
                <div className="bg-[#16a34a] text-white text-center rounded-lg py-2.5 text-sm font-semibold">
                  Apply now
                </div>
                {requiresFinancialCheck && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
                    <p className="text-xs text-gray-600">
                      As part of this application, you&apos;ll be asked to upload bank statements for a financial check.
                      Your data is processed securely and never shared without your permission.
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-3">
                  If you weren&apos;t expecting this email, you can safely ignore it.
                </p>
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recipients</p>
            <div className="space-y-1">
              {emails.map((email, i) => (
                <p key={i} className="text-sm text-gray-700 font-mono">
                  {email}
                </p>
              ))}
            </div>
          </div>

          {/* Billing notice */}
          {requiresFinancialCheck && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-500 shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">You&apos;ll only be charged when you unlock a completed report — not for invites.</p>
                  <p className="text-amber-700 text-xs">
                    If all {count} applicant{s} complete their check, estimated total: {costDisplay}
                    {count > 1 && <span> (£9.99 first report, £1.49 each additional)</span>}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
          <button
            onClick={onConfirm}
            disabled={sending}
            className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {sending ? 'Sending…' : `Send ${count} invite${s}`}
          </button>
          <button
            onClick={onClose}
            className="w-full text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors text-center py-1"
          >
            ← Back to edit
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGBP(pence: number): string {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// ── Info tooltip ──────────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center">
      <span className="w-4 h-4 rounded-full bg-gray-100 text-[#9CA3AF] text-[10px] font-bold flex items-center justify-center cursor-help select-none">i</span>
      <span className="pointer-events-none absolute left-5 top-0 z-20 hidden group-hover:block w-64 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 shadow-xl leading-relaxed whitespace-normal">
        {text}
      </span>
    </span>
  )
}

// ── Payment types ─────────────────────────────────────────────────────────────

interface RentPayment {
  id: string
  tenancyId: string
  amount: number
  dueDate: string
  receivedDate: string | null
  receivedAmount: number | null
  status: 'PENDING' | 'EXPECTED' | 'RECEIVED' | 'LATE' | 'PARTIAL'
  note: string | null
}

const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Upcoming',  cls: 'bg-gray-100 text-gray-500' },
  EXPECTED: { label: 'Due today', cls: 'bg-blue-100 text-blue-700' },
  RECEIVED: { label: 'Received',  cls: 'bg-green-100 text-green-700' },
  LATE:     { label: 'Late',      cls: 'bg-red-100 text-red-700' },
  PARTIAL:  { label: 'Partial',   cls: 'bg-orange-100 text-orange-700' },
}

function PaymentBadge({ status }: { status: string }) {
  const cfg = PAYMENT_STATUS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
}

// ── Mark as received inline form ──────────────────────────────────────────────

function MarkReceivedForm({ payment, onSaved, onClose }: { payment: RentPayment; onSaved: () => void; onClose: () => void }) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState(() => (payment.amount / 100).toFixed(2))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const pence = Math.round(parseFloat(amount) * 100)
    const res = await fetch(`/api/payments/${payment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receivedDate: new Date(date).toISOString(),
        ...(pence !== payment.amount ? { receivedAmount: pence } : {}),
        ...(note ? { note } : {}),
      }),
    })
    setSaving(false)
    if (res.ok) { onSaved(); onClose() }
  }

  return (
    <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1">Date received</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[#1A1A1A] text-xs focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1">Amount (£)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[#1A1A1A] text-xs focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. paid via bank transfer"
          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[#1A1A1A] text-xs placeholder-gray-400 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Confirm'}
        </button>
        <button onClick={onClose} className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors px-2">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Rent Payments section (landlord) ──────────────────────────────────────────

function RentPaymentsSection({ propertyId }: { propertyId: string }) {
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [openFormId, setOpenFormId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/payments?propertyId=${propertyId}`)
    const json = await res.json()
    if (json.data) setPayments(json.data)
    setLoading(false)
  }, [propertyId])

  useEffect(() => { load() }, [load])

  const upcoming = payments.filter((p) => !['RECEIVED', 'PARTIAL'].includes(p.status))
  const history  = payments.filter((p) =>  ['RECEIVED', 'PARTIAL'].includes(p.status))

  const nextDue      = upcoming[upcoming.length - 1] ?? null // sorted desc, so last = earliest
  const lastReceived = history[0] ?? null
  const monthlyAmt   = payments[0]?.amount ?? null

  const tooltipText = "You're marking payments manually for now. Open Banking integration is coming soon — your rent payments will be confirmed automatically."

  const headerRow = (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Rent Payments</p>
      <InfoTooltip text={tooltipText} />
    </div>
  )

  const helpBtn = (
    <div className="pt-3 shrink-0">
      <SectionHelpButton onClick={() => setShowHelp(true)} />
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-start gap-3 mb-5">
      <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
        {headerRow}
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      {helpBtn}
      <SectionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} section="rent" />
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="flex items-start gap-3 mb-5">
      <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
        {headerRow}
        <p className="text-[#9CA3AF] text-sm italic">
          Payments will appear once the tenancy has a rent amount and payment day set.
        </p>
      </div>
      {helpBtn}
      <SectionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} section="rent" />
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 mb-5">
    <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
      {headerRow}

      {/* Summary strip */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-sm">
        {monthlyAmt && <span className="text-[#374151] font-medium">{formatGBP(monthlyAmt)}/mo</span>}
        {nextDue && (
          nextDue.status === 'LATE'
            ? <span className="text-red-600 font-medium">Overdue since {formatDate(nextDue.dueDate)}</span>
            : <span className="text-[#6B7280]">Next due: {formatDate(nextDue.dueDate)}</span>
        )}
        {lastReceived?.receivedDate && (
          <span className="text-[#6B7280]">Last received: {formatDate(lastReceived.receivedDate)}</span>
        )}
      </div>

      {/* Upcoming payments */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-wide mb-2">Upcoming</p>
          <div className="space-y-2">
            {[...upcoming].reverse().map((p) => (
              <div key={p.id}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#1A1A1A] text-sm font-medium">{monthLabel(p.dueDate)}</span>
                      <span className="text-[#9CA3AF] text-xs">Due {formatDate(p.dueDate)}</span>
                      <span className="text-[#374151] text-sm">{formatGBP(p.amount)}</span>
                      <PaymentBadge status={p.status} />
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenFormId(openFormId === p.id ? null : p.id)}
                    className="shrink-0 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Mark received
                  </button>
                </div>
                {openFormId === p.id && (
                  <MarkReceivedForm
                    payment={p}
                    onSaved={load}
                    onClose={() => setOpenFormId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History toggle */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors mb-2"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showHistory ? 'Hide' : 'Show'} payment history ({history.length})
          </button>

          {showHistory && (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              {history.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-[#374151] text-sm">{monthLabel(p.dueDate)}</span>
                    <span className="text-[#9CA3AF] text-xs">Due {formatDate(p.dueDate)}</span>
                    <span className="text-[#6B7280] text-sm">
                      {p.status === 'PARTIAL' && p.receivedAmount ? formatGBP(p.receivedAmount) : formatGBP(p.amount)}
                    </span>
                    <PaymentBadge status={p.status} />
                    {p.note && <span className="text-[#9CA3AF] text-xs truncate max-w-[140px]">{p.note}</span>}
                  </div>
                  {p.receivedDate && (
                    <span className="shrink-0 text-[#9CA3AF] text-xs">{formatDate(p.receivedDate)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    {helpBtn}
    <SectionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} section="rent" />
    </div>
  )
}

// ── Compliance & Documents section ────────────────────────────────────────────

function ComplianceSection({ propertyId }: { propertyId: string }) {
  const [docs, setDocs] = useState<PropertyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/documents?propertyId=${propertyId}`)
    const json = await res.json()
    if (json.data) setDocs(json.data)
    setLoading(false)
  }, [propertyId])

  useEffect(() => { loadDocs() }, [loadDocs])

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

  const requiredTypes = ['GAS_SAFETY', 'EPC', 'EICR', 'HOW_TO_RENT']

  return (
    <div className="flex items-start gap-3 mb-5">
    <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Property Documents</p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-sm bg-[#16a34a] hover:bg-[#15803d] text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
      </div>

      {/* Required compliance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {requiredTypes.map((type) => {
          const st = complianceStatusFromDocs(docs, type)
          const doc = docs.find((d) => d.documentType === type)
          return (
            <div key={type} className="bg-white border border-black/[0.06] rounded-xl p-3 transition-all duration-300 hover:bg-gray-50 hover:border-green-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
              <div className="text-[#6B7280] mb-2">{REQUIRED_DOC_ICONS[type]}</div>
              <p className="text-[#1A1A1A] text-xs font-medium leading-snug mb-1.5">{DOC_TYPE_LABELS[type]}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
              {doc?.expiryDate && (
                <p className="mt-1.5">
                  <ExpiryBadge expiryDate={doc.expiryDate} />
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* All documents list */}
      <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wide mb-3">All Documents</p>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-[#9CA3AF] text-sm">No documents uploaded yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 text-sm text-[#16a34a] hover:text-[#15803d] transition-colors"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docs.map((doc) => {
            const ack = doc.acknowledgments[0]
            return (
              <div key={doc.id} className="bg-white border border-black/[0.06] rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 hover:bg-gray-50 hover:border-green-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                <div className="flex items-start gap-3">
                  <FileIcon mimeType={doc.mimeType} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1A1A1A] text-sm font-medium truncate" title={doc.fileName}>{doc.fileName}</p>
                    <p className="text-[#6B7280] text-xs mt-0.5">{DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
                    <p className="text-[#9CA3AF] text-xs">{formatBytes(doc.fileSize)} · {formatDate(doc.uploadedAt)}</p>
                  </div>
                </div>

                {doc.expiryDate && (
                  <div>
                    <ExpiryBadge expiryDate={doc.expiryDate} />
                  </div>
                )}

                <div className="text-xs">
                  {ack ? (
                    <span className="text-green-700">Seen by {ack.tenant.name} on {formatDate(ack.acknowledgedAt)}</span>
                  ) : (
                    <span className="text-[#9CA3AF]">Not yet seen by tenant</span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <button
                    onClick={() => downloadDoc(doc.id, doc.fileName)}
                    className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <DeleteDocButton docId={doc.id} onDeleted={loadDocs} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DocumentUploadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onUploaded={loadDocs}
        uploadEndpoint="/api/documents/upload"
        extraFields={{ propertyId }}
        documentTypes={Object.entries(DOC_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        expiryDateTypes={['GAS_SAFETY', 'EPC', 'EICR']}
      />
    </div>
    <div className="pt-3 shrink-0">
      <SectionHelpButton onClick={() => setShowHelp(true)} />
    </div>
    <SectionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} section="documents" />
    </div>
  )
}

// ── Property Maintenance section ─────────────────────────────────────────────

interface MaintenanceRequest {
  id: string
  title: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  createdAt: string
  tenant: { name: string }
}

const MAINT_PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH:   'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW:    'bg-gray-100 text-gray-500',
}

const MAINT_STATUS_BADGE: Record<string, string> = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED:    'bg-green-100 text-green-700',
}

// ── Rooms Section ─────────────────────────────────────────────────────────────

const roomInputClass = `${inputClass} min-w-0`

function RoomsSection({ propertyId, rooms: initialRooms }: { propertyId: string; rooms: PropertyRoom[] }) {
  const [rooms, setRooms] = useState<PropertyRoom[]>(initialRooms)
  const [editing, setEditing] = useState(false)
  const [editRooms, setEditRooms] = useState<RoomEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoom, setNewRoom] = useState<RoomEntry>({ type: 'OTHER', name: '' })

  // Derive bedroom count from the room list (two-way sync)
  const bedroomCount = editRooms.filter((r) => r.type === 'BEDROOM').length

  function startEdit() {
    setEditRooms(rooms.map((r) => ({ type: r.type, name: r.name })))
    setAddingRoom(false)
    setNewRoom({ type: 'OTHER', name: '' })
    setEditing(true)
  }

  function updateEditRoom(index: number, field: keyof RoomEntry, value: string) {
    setEditRooms((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function removeEditRoom(index: number) {
    setEditRooms((prev) => prev.filter((_, i) => i !== index))
  }

  function addEditRoom(type: string, name: string) {
    setEditRooms((prev) => [...prev, { type, name }])
  }

  function handleBedroomPick(target: number) {
    if (target === bedroomCount) return

    setEditRooms((prev) => {
      if (target > bedroomCount) {
        // Add bedrooms
        const toAdd: RoomEntry[] = []
        for (let i = bedroomCount + 1; i <= target; i++) {
          toAdd.push({ type: 'BEDROOM', name: `Bedroom ${i}` })
        }
        return [...prev, ...toAdd]
      } else {
        // Remove bedrooms from the bottom
        const removing = bedroomCount - target
        if (removing > 0 && !window.confirm(`Remove ${removing} bedroom${removing > 1 ? 's' : ''} from the list?`)) {
          return prev
        }
        let removed = 0
        // Walk backwards to remove last bedroom rows first
        const result = [...prev]
        for (let i = result.length - 1; i >= 0 && removed < removing; i--) {
          if (result[i].type === 'BEDROOM') {
            result.splice(i, 1)
            removed++
          }
        }
        return result
      }
    })
  }

  function confirmNewRoom() {
    if (!newRoom.name.trim()) return
    addEditRoom(newRoom.type, newRoom.name.trim())
    setNewRoom({ type: 'OTHER', name: '' })
    setAddingRoom(false)
  }

  async function saveRooms() {
    setSaving(true)
    try {
      // Save bedrooms via PATCH (use derived count from room list)
      await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedrooms: bedroomCount || 1 }),
      })

      // Save rooms via POST
      const res = await fetch(`/api/properties/${propertyId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooms: editRooms.map((r, i) => ({ type: r.type, name: r.name, order: i })),
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setRooms(json.data)
        setEditing(false)
      }
    } catch {
      // TODO: wire showErrorToast() to remaining API calls
      showErrorToast({ context: 'saving rooms' })
    }
    setSaving(false)
  }

  const usedTypes = new Set(editRooms.map((r) => r.type))
  const availableQuickAdd = QUICK_ADD_ROOMS.filter((r) => !usedTypes.has(r.type))

  // Display bedroom count from saved rooms in read mode
  const savedBedroomCount = rooms.filter((r) => r.type === 'BEDROOM').length

  return (
    <div className="flex items-start gap-3 mb-5">
    <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Rooms</p>
        {!editing && (
          <button onClick={startEdit} className="text-xs text-[#16a34a] hover:text-[#15803d] font-medium transition-colors">
            Edit rooms
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          {/* Bedroom count picker — synced with room list */}
          <div>
            <p className="text-sm text-[#374151] mb-1.5">Bedrooms</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleBedroomPick(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    bedroomCount === n
                      ? 'bg-[#16a34a] text-white'
                      : 'bg-gray-100 text-[#374151] hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Room rows */}
          <div className="space-y-2">
            {editRooms.map((room, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={room.type}
                  onChange={(e) => updateEditRoom(i, 'type', e.target.value)}
                  className={selectClassCompact}
                >
                  {Object.entries(ROOM_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <input
                  value={room.name}
                  onChange={(e) => updateEditRoom(i, 'name', e.target.value)}
                  className={`${roomInputClass} flex-1`}
                  placeholder="Room name"
                />
                {editRooms.length > 1 && (
                  <button type="button" onClick={() => removeEditRoom(i)}
                    className="shrink-0 w-7 h-7 rounded text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Inline add-room form */}
          {addingRoom && (
            <div className="flex items-center gap-2">
              <select
                value={newRoom.type}
                onChange={(e) => setNewRoom((prev) => ({ ...prev, type: e.target.value }))}
                className={selectClassCompact}
              >
                {Object.entries(ROOM_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <input
                value={newRoom.name}
                onChange={(e) => setNewRoom((prev) => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && confirmNewRoom()}
                className={`${roomInputClass} flex-1`}
                placeholder="Room name"
                autoFocus
              />
              <button type="button" onClick={confirmNewRoom} disabled={!newRoom.name.trim()}
                className="shrink-0 w-7 h-7 rounded text-[#16a34a] hover:bg-green-50 disabled:opacity-30 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button type="button" onClick={() => { setAddingRoom(false); setNewRoom({ type: 'OTHER', name: '' }) }}
                className="shrink-0 w-7 h-7 rounded text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Quick add chips + Add Room button */}
          <div className="flex flex-wrap gap-1.5">
            {availableQuickAdd.map((r) => (
              <button key={r.type} type="button" onClick={() => addEditRoom(r.type, r.name)}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-[#374151] text-xs rounded-md transition-colors">
                + {r.name}
              </button>
            ))}
            {!addingRoom && (
              <button type="button" onClick={() => setAddingRoom(true)}
                className="px-2.5 py-1 bg-[#16a34a]/10 hover:bg-[#16a34a]/20 text-[#16a34a] text-xs font-medium rounded-md transition-colors">
                + Add Room
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={saveRooms} disabled={saving || editRooms.length === 0 || editRooms.some((r) => !r.name.trim())}
              className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : rooms.length > 0 ? (
        <div>
          {savedBedroomCount > 0 && (
            <p className="text-xs text-[#9CA3AF] mb-2">{savedBedroomCount} bedroom{savedBedroomCount !== 1 ? 's' : ''}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {rooms.map((room) => (
              <div key={room.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <span className="text-sm text-[#1A1A1A]">{room.name}</span>
                <span className="text-xs text-[#9CA3AF]">{ROOM_TYPE_LABELS[room.type] ?? room.type}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#9CA3AF]">No rooms configured yet.</p>
      )}
    </div>
    <div className="pt-3 shrink-0">
      <SectionHelpButton onClick={() => setShowHelp(true)} />
    </div>
    <SectionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} section="rooms" />
    </div>
  )
}

// ── Check-in Section ──────────────────────────────────────────────────────────

function CheckInSection({ propertyId }: { propertyId: string }) {
  const [report, setReport] = useState<{ id: string; status: string; pdfUrl: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/check-in?propertyId=${propertyId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setReport(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [propertyId])

  async function createReport() {
    const res = await fetch('/api/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
    })
    if (res.ok) {
      const json = await res.json()
      router.push(`/dashboard/properties/${propertyId}/check-in?reportId=${json.data.id}`)
    }
  }

  if (loading) return null

  return (
    <div className="flex items-start gap-3 mb-5">
    <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
      <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-3">Check-in Report</p>

      {report?.status === 'AGREED' ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm text-[#1A1A1A] font-medium">Report agreed</span>
          </div>
          <div className="flex gap-2">
            {report.pdfUrl && (
              <button
                onClick={() => window.open(`/api/check-in/${report.id}/pdf`, '_blank')}
                className="text-xs text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
              >
                Download PDF
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/properties/${propertyId}/check-in?reportId=${report.id}`)}
              className="text-xs text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
            >
              View report
            </button>
          </div>
        </div>
      ) : report ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${report.status === 'DRAFT' ? 'bg-gray-400' : 'bg-orange-400'}`} />
            <span className="text-sm text-[#6B7280]">
              {report.status === 'DRAFT' ? 'Draft in progress' : report.status === 'PENDING' ? 'Sent to tenant' : 'Under review'}
            </span>
          </div>
          <button
            onClick={() => router.push(`/dashboard/properties/${propertyId}/check-in?reportId=${report.id}`)}
            className="text-xs text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      ) : (
        <button onClick={createReport}
          className="inline-flex items-center gap-1.5 text-sm text-[#16a34a] hover:text-[#15803d] font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create check-in report
        </button>
      )}
    </div>
    <div className="pt-3 shrink-0">
      <SectionHelpButton onClick={() => setShowHelp(true)} />
    </div>
    <SectionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} section="checkin" />
    </div>
  )
}

// ── Maintenance Section ───────────────────────────────────────────────────────

const MAINT_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved',
}

function PropertyMaintenanceSection({ propertyId }: { propertyId: string }) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    fetch(`/api/maintenance?propertyId=${propertyId}&status=OPEN`)
      .then((r) => r.json())
      .then((json) => { if (json.data) setRequests(json.data) })
      .finally(() => setLoading(false))
  }, [propertyId])

  return (
    <div className="flex items-start gap-3 mb-5">
    <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Maintenance</p>
        <a
          href={`/dashboard/maintenance?propertyId=${propertyId}`}
          className="text-xs text-[#16a34a] hover:text-[#15803d] transition-colors"
        >
          View all →
        </a>
      </div>
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-[#9CA3AF] text-sm italic">No open maintenance requests</p>
      ) : (
        <div>
          {requests.map((req, i) => (
            <a
              key={req.id}
              href={`/dashboard/maintenance/${req.id}`}
              className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50 -mx-4 px-4 transition-colors`}
            >
              <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${MAINT_PRIORITY_BADGE[req.priority]}`}>
                {req.priority}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[#1A1A1A] text-sm font-medium truncate">{req.title}</p>
                <p className="text-[#6B7280] text-xs">{req.tenant.name}</p>
              </div>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${MAINT_STATUS_BADGE[req.status]}`}>
                {MAINT_STATUS_LABEL[req.status]}
              </span>
              <svg className="w-4 h-4 text-[#D1D5DB] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
    <div className="pt-3 shrink-0">
      <SectionHelpButton onClick={() => setShowHelp(true)} />
    </div>
    <SectionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} section="maintenance" />
    </div>
  )
}

// ── Financial score helpers ────────────────────────────────────────────────────

function gradeStyle(grade: string | null): { bg: string; text: string; border: string } {
  if (!grade) return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' }
  if (grade === 'Excellent' || grade === 'Good') return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' }
  if (grade === 'Fair') return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' }
  if (grade === 'Poor') return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' }
  return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FinancialScoreBadge({ report }: { report: FinancialReport }) {
  const [expanded, setExpanded] = useState(false)
  const [showWarning, setShowWarning] = useState(!!report.hasUnverifiedFiles)
  const [verifying, setVerifying] = useState(false)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (report.status === 'PROCESSING' || report.status === 'PENDING') {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-[#9CA3AF]">
        <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        Analysing statement…
      </div>
    )
  }

  if (report.status === 'FAILED' || report.totalScore === null) {
    return (
      <div className="mt-3">
        <div className="text-xs text-red-600 font-medium">Financial analysis failed</div>
        {report.failureReason && (
          <p className="text-xs text-red-500 mt-1">{report.failureReason}</p>
        )}
      </div>
    )
  }

  async function handleVerifyInPerson() {
    setVerifying(true)
    const res = await fetch(`/api/scoring/${report.id}/declarations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifiedInPerson: true }),
    })
    if (res.ok) {
      setShowWarning(false)
    }
    setVerifying(false)
  }

  const { bg, text, border } = gradeStyle(report.grade)

  return (
    <div className={`mt-3 rounded-xl border ${border} p-3`}>
      {/* Amber warning banner for unverified files */}
      {showWarning && report.verificationWarning && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mb-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs text-amber-800 font-medium">Name verification warning</p>
              <p className="text-xs text-amber-700 mt-0.5">{report.verificationWarning}</p>
              <button
                onClick={handleVerifyInPerson}
                disabled={verifying}
                className="mt-2 text-xs text-amber-700 hover:text-amber-900 font-medium border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {verifying ? 'Verifying…' : 'Mark as verified in person'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${bg} ${text} rounded-lg px-3 py-1.5 flex items-center gap-2`}>
            <span className="font-bold text-lg leading-none">{report.totalScore}</span>
            <span className="text-xs font-medium opacity-80">/100</span>
          </div>
          <span className={`text-sm font-semibold ${text}`}>{report.grade}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${appUrl}/verify/${report.verificationToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#9CA3AF] hover:text-[#16a34a] transition-colors"
          >
            Verify report →
          </a>
        </div>
      </div>

      {/* Coverage validation warnings */}
      {report.validationResults && report.validationResults.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {report.validationResults.map((person, i) => {
            if (person.coverageStatus === 'PASS' || person.coverageStatus === 'UNKNOWN') return null
            const label = person.coverageStatus === 'WARN_SHORT'
              ? 'Less than 2 months of data'
              : person.coverageStatus === 'WARN_OLD'
                ? 'Statements older than 6 months'
                : 'Too short and too old'
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                </svg>
                <span className="text-amber-700">
                  <strong>{person.name}</strong>: {label}
                  {person.coverageDays != null && ` (${person.coverageDays} days)`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Joint applicants / income breakdown */}
      {report.jointApplicants && report.jointApplicants.length > 0 && (
        <div className="mt-3 rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-1.5 font-medium text-gray-500">Name</th>
                <th className="text-left px-3 py-1.5 font-medium text-gray-500">Status</th>
                <th className="text-right px-3 py-1.5 font-medium text-gray-500">Income</th>
              </tr>
            </thead>
            <tbody>
              {report.jointApplicants.map((ja, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-3 py-1.5 text-gray-700">{ja.name}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5
                      ${ja.verificationStatus === 'VERIFIED' ? 'bg-green-50 text-green-700' :
                        ja.verificationStatus === 'UNVERIFIED' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-50 text-gray-500'}`}
                    >
                      {ja.verificationStatus === 'VERIFIED' ? 'Verified' :
                        ja.verificationStatus === 'UNVERIFIED' ? 'Unverified' : 'Uncertain'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-700">
                    {ja.income != null ? `£${ja.income.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
              {report.jointApplicants.length > 1 && (
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-3 py-1.5 font-medium text-gray-700" colSpan={2}>Combined total</td>
                  <td className="px-3 py-1.5 text-right font-medium text-gray-700">
                    £{report.jointApplicants.reduce((sum, ja) => sum + (ja.income ?? 0), 0).toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {report.aiSummary && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Hide' : 'Read'} analysis
          </button>
          {expanded && (
            <div className="mt-2">
              <p className="text-[#6B7280] text-xs leading-relaxed">{report.aiSummary}</p>
              {report.breakdown && Object.keys(report.breakdown).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(report.breakdown).map(([cat, pts]) => (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <span className="text-[#9CA3AF] capitalize">{cat.toLowerCase()}</span>
                      <span className={pts >= 0 ? 'text-green-700' : 'text-red-600'}>
                        {pts >= 0 ? '+' : ''}{pts}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add Tenant Modal ──────────────────────────────────────────────────────────

function AddTenantModal({
  propertyId,
  onClose,
  onSuccess,
}: {
  propertyId: string
  onClose: () => void
  onSuccess: (message: string) => void
}) {
  const [tab, setTab] = useState<'full' | 'invite'>('full')
  const [loading, setLoading] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleFullSubmit(data: TenantFormData) {
    setLoading(true)
    setError(null)
    const monthlyRent = Math.round(parseFloat(data.monthlyRentStr) * 100)
    const depositAmount = data.depositAmountStr
      ? Math.round(parseFloat(data.depositAmountStr) * 100)
      : undefined
    const res = await fetch('/api/tenancies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        tenantName: data.tenantName,
        tenantEmail: data.tenantEmail,
        tenantPhone: data.tenantPhone || undefined,
        monthlyRent,
        paymentDay: data.paymentDay,
        startDate: new Date(data.startDate).toISOString(),
        depositAmount,
        depositScheme: data.depositScheme || undefined,
        depositRef: data.depositRef || undefined,
      }),
    })
    setLoading(false)
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to add tenant')
      return
    }
    onSuccess('Tenant added successfully')
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/tenant/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, name: inviteName.trim(), email: inviteEmail.trim() }),
    })
    setLoading(false)
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to send invite')
      return
    }
    onSuccess(`Invite sent to ${inviteEmail.trim()}`)
  }

  const inputClass =
    'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-[#1A1A1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Add tenant</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('full')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'full'
                ? 'text-[#16a34a] border-b-2 border-[#16a34a]'
                : 'text-[#9CA3AF] hover:text-[#6B7280]'
            }`}
          >
            Full details
          </button>
          <button
            onClick={() => setTab('invite')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === 'invite'
                ? 'text-[#16a34a] border-b-2 border-[#16a34a]'
                : 'text-[#9CA3AF] hover:text-[#6B7280]'
            }`}
          >
            Invite only
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          {tab === 'full' ? (
            <TenantDetailsForm
              onSubmit={handleFullSubmit}
              isLoading={loading}
              submitLabel="Add tenant"
              variant="light"
            />
          ) : (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <p className="text-[#6B7280] text-sm mb-4">
                Send an invite email so the tenant can confirm their own details and access their portal.
              </p>
              <div>
                <label className="block text-sm text-[#374151] mb-1.5">Full name</label>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jane Smith"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-[#374151] mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className={inputClass}
                  required
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {loading ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Financial verification toggle ─────────────────────────────────────────────

function FinancialVerificationToggle({
  propertyId,
  enabled,
  onToggle,
  validEmailCount,
}: {
  propertyId: string
  enabled: boolean
  onToggle: (next: boolean) => void
  validEmailCount: number
}) {
  const [saving, setSaving] = useState(false)

  async function toggle() {
    const next = !enabled
    setSaving(true)
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requireFinancialVerification: next }),
    })
    if (res.ok) onToggle(next)
    setSaving(false)
  }

  // Cost estimate
  const costPence = validEmailCount > 0 ? 999 + (validEmailCount - 1) * 149 : 0
  const costDisplay = `£${(costPence / 100).toFixed(2)}`

  function costText(): string | null {
    if (!enabled || validEmailCount === 0) return null
    if (validEmailCount === 1) return `Est. cost: £9.99 to unlock report`
    if (validEmailCount === 2) return `Est. cost: £9.99 + £1.49 = ${costDisplay}`
    return `Est. cost: £9.99 + ${validEmailCount - 1} × £1.49 = ${costDisplay}`
  }

  return (
    <div className="py-3 border-t border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#374151] text-sm font-medium">Require financial verification from applicants</p>
          <p className="text-[#9CA3AF] text-xs mt-0.5">
            {enabled
              ? 'Applicants must upload bank statements to apply'
              : 'Applicants will not be asked to upload bank statements'}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50
            ${enabled ? 'bg-green-500' : 'bg-gray-200'}`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform
              ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
      {costText() && (
        <div className="mt-2">
          <p className="text-[13px] text-gray-400">{costText()}</p>
          <p className="text-[12px] text-gray-400 italic mt-0.5">You only pay when you unlock a report</p>
        </div>
      )}
    </div>
  )
}

// ── Unified invite status config ─────────────────────────────────────────────

type InviteStatus = 'invited' | 'applied' | 'analysing' | 'complete'

interface MergedInvite {
  inviteId: string
  email: string
  sentAt: string
  status: InviteStatus
  candidateName?: string
  candidateId?: string
  reportId?: string
  totalScore?: number | null
  grade?: string | null
}

function scoreTextColour(grade: string | null | undefined): string {
  if (!grade) return 'text-gray-500'
  if (grade === 'Excellent' || grade === 'Good') return 'text-green-700'
  if (grade === 'Fair') return 'text-amber-700'
  if (grade === 'Poor') return 'text-orange-700'
  return 'text-red-700'
}

const UNIFIED_BADGE: Record<InviteStatus, { label: string; cls: string }> = {
  invited:   { label: 'Invited',   cls: 'bg-gray-100 text-gray-500' },
  applied:   { label: 'Applied',   cls: 'bg-blue-100 text-blue-700' },
  analysing: { label: 'Analysing', cls: 'bg-blue-100 text-blue-700' },
  complete:  { label: 'Complete',  cls: 'bg-green-100 text-green-700' },
}

function deriveInviteStatus(candidate: Tenant | undefined): InviteStatus {
  if (!candidate) return 'invited'
  const report = candidate.financialReports[0]
  if (!report) return 'applied'
  if (report.status === 'PROCESSING' || report.status === 'PENDING') return 'analysing'
  return 'complete'
}

function buildMergedList(invites: ApplicationInvite[], candidates: Tenant[]): MergedInvite[] {
  const candidateByEmail = new Map<string, Tenant>()
  for (const c of candidates) candidateByEmail.set(c.email.toLowerCase(), c)

  const merged: MergedInvite[] = invites.map((inv) => {
    const candidate = candidateByEmail.get(inv.email.toLowerCase())
    return {
      inviteId: inv.id,
      email: inv.email,
      sentAt: inv.sentAt,
      status: deriveInviteStatus(candidate),
      candidateName: candidate?.name,
      candidateId: candidate?.id,
      reportId: candidate?.financialReports[0]?.id ?? undefined,
      totalScore: candidate?.financialReports[0]?.totalScore,
      grade: candidate?.financialReports[0]?.grade,
    }
  })

  // Include candidates who applied via public link (no matching invite)
  const invitedEmails = new Set(invites.map((i) => i.email.toLowerCase()))
  for (const c of candidates) {
    if (!invitedEmails.has(c.email.toLowerCase())) {
      merged.push({
        inviteId: `candidate-${c.id}`,
        email: c.email,
        sentAt: '',
        status: deriveInviteStatus(c),
        candidateName: c.name,
        candidateId: c.id,
        reportId: c.financialReports[0]?.id ?? undefined,
        totalScore: c.financialReports[0]?.totalScore,
        grade: c.financialReports[0]?.grade,
      })
    }
  }

  return merged
}

// ── Select tenant confirmation modal ────────────────────────────────────────

function SelectTenantModal({
  selectedInvite,
  otherInvites,
  onConfirm,
  onClose,
  selecting,
}: {
  selectedInvite: { candidateName?: string; email: string }
  otherInvites: MergedInvite[]
  onConfirm: () => void
  onClose: () => void
  selecting: boolean
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const rejectableInvites = otherInvites.filter((inv) =>
    ['applied', 'analysing', 'complete'].includes(inv.status)
  )
  const displayName = selectedInvite.candidateName ?? selectedInvite.email

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[#1A1A1A] font-semibold">
            {step === 1 ? 'Confirm tenant selection' : 'Are you absolutely sure?'}
          </h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 1 ? (
          <>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Selected tenant (green) */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-green-800">Selected tenant</p>
                </div>
                <p className="text-sm text-green-700 font-medium">{displayName}</p>
                <p className="text-xs text-green-600">{selectedInvite.email}</p>
                <p className="text-xs text-green-600 mt-2">
                  They&apos;ll receive an email with a link to the tenant portal.
                </p>
              </div>

              {/* Rejected applicants (amber) */}
              {rejectableInvites.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm font-semibold text-amber-800">
                      {rejectableInvites.length} other applicant{rejectableInvites.length !== 1 ? 's' : ''} will be notified
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {rejectableInvites.map((inv) => (
                      <div key={inv.inviteId} className="flex items-center gap-2">
                        <span className="text-xs text-amber-700">{inv.candidateName ?? inv.email}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    They&apos;ll receive a polite rejection email — no scores or reasons shared.
                  </p>
                </div>
              )}
            </div>

            {/* Footer — Step 1 */}
            <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
              <button
                onClick={() => setStep(2)}
                className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold rounded-xl py-3 text-sm transition-colors"
              >
                Confirm — select {displayName}
              </button>
              <button
                onClick={onClose}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl py-3 text-sm transition-colors"
              >
                Go back
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Rose warning */}
            <div className="overflow-y-auto flex-1 p-5">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-6 h-6 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-rose-800 font-semibold">This action cannot be undone</p>
                </div>
                <p className="text-sm text-rose-700 mb-3">
                  Selecting <strong>{displayName}</strong> as your tenant will:
                </p>
                <ul className="text-sm text-rose-700 space-y-1.5 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                    Send {displayName} a link to the tenant portal
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                    Send rejection emails to all other applicants
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                    This cannot be undone — choose carefully
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer — Step 2 */}
            <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
              <button
                onClick={onConfirm}
                disabled={selecting}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
              >
                {selecting ? 'Processing…' : `Yes, confirm — select ${displayName}`}
              </button>
              <button
                onClick={() => setStep(1)}
                disabled={selecting}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl py-3 text-sm transition-colors"
              >
                Go back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Applications section ────────────────────────────────────────────────────

function ApplicationsSection({
  property,
  candidates,
  applyLink,
  onRefresh,
  historyOnly = false,
}: {
  property: Property
  candidates: Tenant[]
  applyLink: string
  onRefresh: () => void
  historyOnly?: boolean
}) {
  const [emails, setEmails] = useState<string[]>([''])
  const [requireFinancial, setRequireFinancial] = useState(property.requireFinancialVerification)
  const [showPreview, setShowPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [selectInvite, setSelectInvite] = useState<MergedInvite | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const validEmails = emails.filter((e) => EMAIL_RE.test(e))
  const hasValidEmails = validEmails.length > 0

  // Build merged list from persisted invites + candidates
  const mergedList = buildMergedList(property.applicationInvites ?? [], candidates)

  async function handleSendInvites() {
    setSending(true)
    let allOk = true
    for (const email of validEmails) {
      const res = await fetch('/api/tenant/application-link-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id, email }),
      })
      if (!res.ok) allOk = false
    }
    setSending(false)
    setShowPreview(false)
    if (allOk) {
      setEmails([''])
      onRefresh()
    }
  }

  async function handleResend(inviteEmail: string, inviteId: string) {
    setResendingId(inviteId)
    await fetch('/api/tenant/application-link-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: property.id, email: inviteEmail }),
    })
    setResendingId(null)
  }

  async function handleDeleteInvite(id: string) {
    setDeletingId(id)
    setConfirmDeleteId(null)
    try {
      const res = await fetch(`/api/application-invites/${id}`, { method: 'DELETE' })
      if (res.ok) onRefresh()
    } catch {
      showErrorToast({ context: 'Deleting invite' })
    }
    setDeletingId(null)
  }

  // Can select tenant: only if no active/invited tenant exists
  const hasActiveTenant = property.tenants.some((t) => t.status === 'TENANT' || t.status === 'INVITED')
  const canSelectTenant = !hasActiveTenant && (property.status === 'VACANT' || property.status === 'APPLICATION_OPEN')

  async function handleSelectTenant() {
    if (!selectInvite) return
    setSelecting(true)
    try {
      const res = await fetch('/api/screening/select-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId: selectInvite.candidateId ? `candidate-${selectInvite.candidateId}` : selectInvite.inviteId,
          propertyId: property.id,
        }),
      })
      if (res.ok) {
        setSelectInvite(null)
        onRefresh()
      }
    } catch { /* silent */ }
    setSelecting(false)
  }

  const address = [property.line1, property.city, property.postcode].filter(Boolean).join(', ')

  // History-only collapsed mode (tenant already selected)
  if (historyOnly) {
    const totalApplicants = mergedList.length
    if (totalApplicants === 0) return null

    return (
      <div className="flex items-start gap-3 mb-5">
      <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Applications</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF]">
              {expanded ? 'Hide' : `View application history (${totalApplicants})`}
            </span>
            <svg
              className={`w-4 h-4 text-[#9CA3AF] transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {expanded && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="space-y-0">
              {mergedList.map((inv) => {
                const badge = UNIFIED_BADGE[inv.status]
                return (
                  <div key={inv.inviteId} className="py-2.5 border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-[#1A1A1A] font-medium">{inv.candidateName ?? inv.email}</span>
                          <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {inv.status === 'complete' && inv.totalScore != null && (
                            <span className={`text-xs font-semibold ${scoreTextColour(inv.grade)}`}>
                              {inv.totalScore}/100
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          {inv.candidateName ? inv.email : null}
                          {inv.sentAt ? `${inv.candidateName ? ' · ' : ''}Invited ${formatDate(inv.sentAt)}` : null}
                        </p>
                      </div>
                      {inv.status === 'complete' && inv.reportId && (
                        <Link
                          href={`/screening/report/${inv.reportId}`}
                          className="px-3 py-1.5 text-xs font-medium text-[#16a34a] bg-white border border-[#16a34a] rounded-md hover:bg-[#f0fdf4] transition-colors shrink-0"
                        >
                          View report
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <div className="pt-3 shrink-0">
        <SectionHelpButton onClick={() => setShowHelp(true)} />
      </div>
      <SectionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} section="applications" />
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 mb-5">
    <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
      <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-3">Applications</p>

      {/* Application link */}
      <div className="mb-4">
        <p className="text-[#6B7280] text-sm mb-2">Share this link with prospective tenants:</p>
        <div className="flex flex-wrap gap-2">
          <code className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-[#6B7280] truncate font-mono">
            {applyLink}
          </code>
          <CopyButton text={applyLink} label="Copy" />
        </div>
      </div>

      {/* Multi-email invite */}
      <div className="mb-4">
        <p className="text-[#374151] text-sm font-medium mb-2">Invite applicants by email</p>
        <MultiEmailInput emails={emails} setEmails={setEmails} />
      </div>

      {/* Financial verification toggle */}
      <FinancialVerificationToggle
        propertyId={property.id}
        enabled={requireFinancial}
        onToggle={setRequireFinancial}
        validEmailCount={validEmails.length}
      />

      {/* Send button */}
      <div className="mt-4">
        <button
          onClick={() => setShowPreview(true)}
          disabled={!hasValidEmails}
          className="bg-[#16a34a] hover:bg-[#15803d] disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Send invite{validEmails.length !== 1 ? 's' : ''}
        </button>
      </div>

      {/* Unified applicant list */}
      {mergedList.length > 0 ? (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wide mb-2">
            Applicants ({mergedList.length})
          </p>
          <div className="space-y-0">
            {mergedList.map((inv) => {
              const badge = UNIFIED_BADGE[inv.status]
              const isConfirming = confirmDeleteId === inv.inviteId
              const isPersistedInvite = !inv.inviteId.startsWith('candidate-')
              return (
                <div key={inv.inviteId} className={`py-2.5 border-b border-gray-100 last:border-0 transition-opacity duration-200 ${deletingId === inv.inviteId ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {inv.status === 'complete' && inv.reportId ? (
                          <Link href={`/screening/report/${inv.reportId}`} title="View report" className="text-sm text-[#1A1A1A] font-medium hover:text-[#16a34a] transition-colors underline decoration-gray-300 hover:decoration-[#16a34a]">
                            {inv.candidateName ?? inv.email}
                          </Link>
                        ) : (
                          <span className="text-sm text-[#1A1A1A] font-medium">{inv.candidateName ?? inv.email}</span>
                        )}
                        <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {inv.status === 'complete' && inv.totalScore != null && (
                          <span className={`text-xs font-semibold ${scoreTextColour(inv.grade)}`}>
                            {inv.totalScore}/100
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        {inv.candidateName ? inv.email : null}
                        {inv.sentAt ? `${inv.candidateName ? ' · ' : ''}Invited ${formatDate(inv.sentAt)}` : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.status === 'complete' && inv.reportId && (
                        <Link
                          href={`/screening/report/${inv.reportId}`}
                          className="px-3 py-1.5 text-xs font-medium text-[#16a34a] bg-white border border-[#16a34a] rounded-md hover:bg-[#f0fdf4] transition-colors"
                        >
                          View report
                        </Link>
                      )}
                      {canSelectTenant && inv.status === 'complete' && inv.candidateId && (
                        <button
                          onClick={() => setSelectInvite(inv)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-[#16a34a] hover:bg-[#15803d] rounded-md transition-colors"
                        >
                          Select as tenant
                        </button>
                      )}
                      {inv.status === 'invited' && (
                        <button
                          onClick={() => handleResend(inv.email, inv.inviteId)}
                          disabled={resendingId === inv.inviteId}
                          className="shrink-0 text-xs text-gray-400 hover:text-[#16a34a] transition-colors disabled:opacity-50"
                        >
                          {resendingId === inv.inviteId ? 'Sending…' : 'Resend'}
                        </button>
                      )}
                      {isPersistedInvite && (
                        <button
                          onClick={() => setConfirmDeleteId(isConfirming ? null : inv.inviteId)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                          title="Delete invite"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {isConfirming && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-500">Remove this invite? This cannot be undone.</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeleteInvite(inv.inviteId)} className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">Delete</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                  {inv.status === 'analysing' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-blue-600">Analysing bank statements…</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-[#9CA3AF] text-sm italic mt-3">No applications yet</p>
      )}

      {/* Invite preview modal */}
      {showPreview && (
        <InvitePreviewModal
          emails={validEmails}
          requiresFinancialCheck={requireFinancial}
          propertyAddress={address}
          onConfirm={handleSendInvites}
          onClose={() => setShowPreview(false)}
          sending={sending}
        />
      )}

      {/* Select tenant confirmation modal */}
      {selectInvite && (
        <SelectTenantModal
          selectedInvite={selectInvite}
          otherInvites={mergedList.filter((inv) => inv.inviteId !== selectInvite.inviteId)}
          onConfirm={handleSelectTenant}
          onClose={() => setSelectInvite(null)}
          selecting={selecting}
        />
      )}
    </div>
    <div className="pt-3 shrink-0">
      <SectionHelpButton onClick={() => setShowHelp(true)} />
    </div>
    <SectionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} section="applications" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState<SectionHelpKey | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const fetchProperty = useCallback(() => {
    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setProperty(json.data)
      })
      .catch(() => setError('Failed to load property'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchProperty() }, [fetchProperty])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#6B7280]">{error ?? 'Property not found'}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#16a34a] hover:text-[#15803d]">← Back</button>
      </div>
    )
  }

  const address = [property.line1, property.line2, property.city, property.postcode].filter(Boolean).join(', ')
  const displayName = property.name ?? property.line1
  const inviteToken = property.tenants.find((t) => t.status === 'INVITED' || t.status === 'TENANT')?.inviteToken
  const activeTenant = property.tenants.find((t) => t.status === 'TENANT')
  const invitedTenant = property.tenants.find((t) => t.status === 'INVITED')
  const currentTenant = activeTenant ?? invitedTenant
  const candidates = property.tenants.filter((t) => t.status === 'CANDIDATE')
  const applyLink = `${appUrl}/apply/${property.id}`
  const portalLink = inviteToken ? `${appUrl}/tenant/join/${inviteToken}` : null
  const activeTenancy = property.tenancies[0] ?? null
  // Tenant selected = collapse applications section (show as expandable history)
  const hasTenantSelected = !!(activeTenant || invitedTenant)

  return (
    <div className="p-4 lg:p-8 max-w-[50rem]">

      {/* Back */}
      <Link href="/dashboard/properties" className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All properties
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[#1A1A1A] text-2xl font-bold">{displayName}</h1>
          {property.name && <p className="text-[#6B7280] text-sm mt-0.5">{address}</p>}
        </div>
        <StatusBadge status={property.status} config={statusConfig} />
      </div>

      {/* ── Compliance & Documents ────────────────────────────────────────── */}
      <ComplianceSection propertyId={property.id} />

      {/* ── Rooms ──────────────────────────────────────────────────────────── */}
      <RoomsSection propertyId={property.id} rooms={property.rooms} />

      {/* ── Check-in Report ────────────────────────────────────────────────── */}
      <CheckInSection propertyId={property.id} />

      {/* ── Tenant section ──────────────────────────────────────────────────── */}
      {(() => {
        const r2rSt = currentTenant ? tenantDocStatus(currentTenant.documents, 'RIGHT_TO_RENT') : 'missing'
        const borderCls = !currentTenant ? 'border-black/[0.06]'
          : (r2rSt === 'missing' || r2rSt === 'expired') ? 'border-red-300'
          : TENANT_STRIP_TYPES.some((t) => tenantDocStatus(currentTenant.documents, t) !== 'valid') ? 'border-orange-300'
          : 'border-green-300'
        return (
          <div className="flex items-start gap-3 mb-5">
          <div className={`flex-1 min-w-0 bg-white border ${borderCls} rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4 transition-colors`}>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-3">Tenant</p>

            {currentTenant ? (
              <div>
                <Link
                  href={`/dashboard/properties/${property.id}/tenant/${currentTenant.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 mb-3 group"
                >
                  <div>
                    <p className="text-[#1A1A1A] font-medium group-hover:text-[#16a34a] transition-colors">{currentTenant.name}</p>
                    <p className="text-[#6B7280] text-sm">{currentTenant.email}</p>
                    {currentTenant.phone && <p className="text-[#9CA3AF] text-xs mt-0.5">{currentTenant.phone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={currentTenant.status} config={tenantStatusConfig} />
                    <svg className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                <div className="flex flex-wrap gap-3 mb-2">
                  {TENANT_STRIP_TYPES.map((type) => {
                    const st = tenantDocStatus(currentTenant.documents, type)
                    const dotCls = st === 'valid' ? 'bg-green-400' : st === 'expiring' ? 'bg-orange-400' : 'bg-red-400/70'
                    return (
                      <div key={type} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
                        <span className="text-xs text-[#9CA3AF]">{TENANT_STRIP_LABELS[type]}</span>
                      </div>
                    )
                  })}
                </div>

                {invitedTenant && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <SendInviteButton tenantId={currentTenant.id} />
                    {portalLink && <CopyButton text={portalLink} label="Copy portal link" />}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAddTenant(true)}
                className="inline-flex items-center gap-1.5 text-sm text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add tenant
              </button>
            )}
          </div>
          <div className="pt-3 shrink-0">
            <SectionHelpButton onClick={() => setHelpOpen('tenant')} />
          </div>
          </div>
        )
      })()}

      {/* ── Rent Payments section ───────────────────────────────────────────── */}
      {activeTenancy && <RentPaymentsSection propertyId={property.id} />}

      {/* ── Maintenance section ──────────────────────────────────────────────── */}
      <PropertyMaintenanceSection propertyId={property.id} />

      {/* ── Applications section ─────────────────────────────────────────────── */}
      <ApplicationsSection
        property={property}
        candidates={candidates}
        applyLink={applyLink}
        onRefresh={fetchProperty}
        historyOnly={hasTenantSelected}
      />

      {/* Add Tenant Modal */}
      {showAddTenant && (
        <AddTenantModal
          propertyId={property.id}
          onClose={() => setShowAddTenant(false)}
          onSuccess={(message) => {
            setShowAddTenant(false)
            fetchProperty()
            showToast(message)
          }}
        />
      )}

      {/* ── More section ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-5">
      <div className="flex-1 min-w-0 bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
        <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-3">More</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
        >
          Delete property &rarr;
        </button>
      </div>
      <div className="pt-3 shrink-0">
        <SectionHelpButton onClick={() => setHelpOpen('more')} />
      </div>
      </div>

      {/* Delete Property Modal */}
      {showDeleteModal && (
        <DeletePropertyModal
          propertyId={property.id}
          propertyAddress={address}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            router.refresh()
            router.push('/dashboard/properties')
          }}
        />
      )}

      {/* Section help modal (for inline sections like Tenant) */}
      <SectionHelpModal
        isOpen={helpOpen !== null}
        onClose={() => setHelpOpen(null)}
        section={helpOpen ?? 'tenant'}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

    </div>
  )
}
