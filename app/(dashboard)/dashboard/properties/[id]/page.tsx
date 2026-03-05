'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DocumentUploadModal from '@/components/shared/DocumentUploadModal'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Property {
  id: string
  name: string | null
  line1: string
  line2: string | null
  city: string
  postcode: string
  status: string
  type: string
  tenants: Tenant[]
  complianceDocs: ComplianceDoc[]
  tenancies: Tenancy[]
}

interface Tenant {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  inviteToken: string
  documents: { documentType: string; expiryDate: string | null }[]
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

const EXPIRY_DOC_TYPES = new Set(['GAS_SAFETY', 'EPC', 'EICR'])

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
  const doc = docs.find((d) => d.documentType === type)
  if (!doc) return 'missing'
  if (doc.expiryDate) {
    const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000)
    if (days < 0) return 'expired'
    if (days <= 30) return 'expiring'
  }
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
  VACANT: { label: 'Vacant', cls: 'bg-white/10 text-white/50' },
  APPLICATION_OPEN: { label: 'Accepting applications', cls: 'bg-blue-500/15 text-blue-300' },
  OFFER_ACCEPTED: { label: 'Offer accepted', cls: 'bg-yellow-500/15 text-yellow-300' },
  ACTIVE: { label: 'Active', cls: 'bg-green-500/15 text-green-300' },
  NOTICE_GIVEN: { label: 'Notice given', cls: 'bg-orange-500/15 text-orange-300' },
}

const tenantStatusConfig: Record<string, { label: string; cls: string }> = {
  CANDIDATE: { label: 'Applied', cls: 'bg-blue-500/15 text-blue-300' },
  INVITED: { label: 'Invited', cls: 'bg-yellow-500/15 text-yellow-300' },
  TENANT: { label: 'Active tenant', cls: 'bg-green-500/15 text-green-300' },
  FORMER_TENANT: { label: 'Former tenant', cls: 'bg-white/10 text-white/40' },
}

function StatusBadge({ status, config }: { status: string; config: typeof statusConfig }) {
  const c = config[status] ?? { label: status, cls: 'bg-white/10 text-white/40' }
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
    <svg className={`${sz} text-white/40 shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

// ── Expiry badge ───────────────────────────────────────────────────────────────

function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const d = new Date(expiryDate)
  const now = new Date()
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return <span className="text-xs text-red-400">Expired {formatDate(expiryDate)}</span>
  if (daysLeft <= 30) return <span className="text-xs text-orange-400">Expires {formatDate(expiryDate)}</span>
  return <span className="text-xs text-green-400">Valid until {formatDate(expiryDate)}</span>
}

// ── Compliance status cards ────────────────────────────────────────────────────

function complianceStatusFromDocs(docs: PropertyDocument[], type: string): { label: string; cls: string } {
  const doc = docs.find((d) => d.documentType === type)
  if (!doc) return { label: 'Not uploaded', cls: 'bg-white/8 text-white/30' }
  if (type === 'HOW_TO_RENT') return { label: 'Issued', cls: 'bg-green-500/15 text-green-300' }
  if (!doc.expiryDate) return { label: 'Uploaded', cls: 'bg-green-500/15 text-green-300' }
  const daysLeft = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { label: 'Expired', cls: 'bg-red-500/15 text-red-300' }
  if (daysLeft <= 30) return { label: 'Expiring soon', cls: 'bg-orange-500/15 text-orange-300' }
  return { label: 'Valid', cls: 'bg-green-500/15 text-green-300' }
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
        className="p-1.5 text-white/25 hover:text-red-400 transition-colors rounded"
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
      <span className="text-white/40">Delete?</span>
      <button onClick={del} disabled={deleting} className="text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50">
        {deleting ? '…' : 'Yes'}
      </button>
      <button onClick={() => setConfirm(false)} className="text-white/30 hover:text-white/60 transition-colors">No</button>
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
      className="text-sm bg-white/8 hover:bg-white/12 text-white/70 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
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
      className="text-sm bg-green-500/15 hover:bg-green-500/25 text-green-400 hover:text-green-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {state === 'sending' ? 'Sending…' : state === 'sent' ? '✓ Sent' : state === 'error' ? 'Error — retry' : 'Send invite email'}
    </button>
  )
}

// ── Application link email form ────────────────────────────────────────────────

function AppLinkEmailForm({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function send() {
    if (!email) return
    setState('sending')
    const res = await fetch('/api/tenant/application-link-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, email }),
    })
    setState(res.ok ? 'sent' : 'error')
    if (res.ok) { setEmail(''); setTimeout(() => { setState('idle'); setOpen(false) }, 2000) }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm bg-white/8 hover:bg-white/12 text-white/70 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        Send by email
      </button>
    )
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="applicant@email.com"
        className="flex-1 min-w-0 bg-[#5f655f] border border-white/15 rounded-lg px-3 py-1.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors"
      />
      <button
        onClick={send}
        disabled={state === 'sending' || !email}
        className="shrink-0 text-sm bg-green-500/15 hover:bg-green-500/25 text-green-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {state === 'sending' ? 'Sending…' : state === 'sent' ? '✓ Sent' : 'Send'}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="shrink-0 text-sm text-white/30 hover:text-white/60 transition-colors"
      >
        Cancel
      </button>
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
      <span className="w-4 h-4 rounded-full bg-white/10 text-white/40 text-[10px] font-bold flex items-center justify-center cursor-help select-none">i</span>
      <span className="pointer-events-none absolute left-5 top-0 z-20 hidden group-hover:block w-64 bg-[#0d1a0d] border border-white/12 rounded-lg px-3 py-2 text-xs text-white/60 shadow-xl leading-relaxed whitespace-normal">
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
  PENDING:  { label: 'Upcoming', cls: 'bg-white/8 text-white/40' },
  EXPECTED: { label: 'Due today', cls: 'bg-blue-500/15 text-blue-300' },
  RECEIVED: { label: 'Received', cls: 'bg-green-500/15 text-green-300' },
  LATE:     { label: 'Late', cls: 'bg-red-500/15 text-red-300' },
  PARTIAL:  { label: 'Partial', cls: 'bg-orange-500/15 text-orange-300' },
}

function PaymentBadge({ status }: { status: string }) {
  const cfg = PAYMENT_STATUS[status] ?? { label: status, cls: 'bg-white/8 text-white/40' }
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
    <div className="mt-2 p-3 bg-black/20 border border-white/8 rounded-xl space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wide block mb-1">Date received</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#1a2e1a] border border-white/12 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-green-500/60 transition-colors [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40 uppercase tracking-wide block mb-1">Amount (£)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#1a2e1a] border border-white/12 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-green-500/60 transition-colors"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-white/40 uppercase tracking-wide block mb-1">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. paid via bank transfer"
          className="w-full bg-[#1a2e1a] border border-white/12 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-white/20 focus:outline-none focus:border-green-500/60 transition-colors"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Confirm'}
        </button>
        <button onClick={onClose} className="text-xs text-white/30 hover:text-white/60 transition-colors px-2">
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
      <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Rent Payments</p>
      <InfoTooltip text={tooltipText} />
    </div>
  )

  if (loading) {
    return (
      <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5">
        {headerRow}
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5">
        {headerRow}
        <p className="text-white/30 text-sm italic">
          Payments will appear once the tenancy has a rent amount and payment day set.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5">
      {headerRow}

      {/* Summary strip */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-sm">
        {monthlyAmt && <span className="text-white/70 font-medium">{formatGBP(monthlyAmt)}/mo</span>}
        {nextDue && (
          nextDue.status === 'LATE'
            ? <span className="text-red-400 font-medium">Overdue since {formatDate(nextDue.dueDate)}</span>
            : <span className="text-white/50">Next due: {formatDate(nextDue.dueDate)}</span>
        )}
        {lastReceived?.receivedDate && (
          <span className="text-white/50">Last received: {formatDate(lastReceived.receivedDate)}</span>
        )}
      </div>

      {/* Upcoming payments */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-white/30 font-medium uppercase tracking-wide mb-2">Upcoming</p>
          <div className="space-y-2">
            {[...upcoming].reverse().map((p) => (
              <div key={p.id}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{monthLabel(p.dueDate)}</span>
                      <span className="text-white/40 text-xs">Due {formatDate(p.dueDate)}</span>
                      <span className="text-white/70 text-sm">{formatGBP(p.amount)}</span>
                      <PaymentBadge status={p.status} />
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenFormId(openFormId === p.id ? null : p.id)}
                    className="shrink-0 text-xs bg-green-500/15 hover:bg-green-500/25 text-green-400 hover:text-green-300 px-2.5 py-1 rounded-lg transition-colors"
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
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-2"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showHistory ? 'Hide' : 'Show'} payment history ({history.length})
          </button>

          {showHistory && (
            <div className="space-y-2 border-t border-white/6 pt-3">
              {history.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-white/60 text-sm">{monthLabel(p.dueDate)}</span>
                    <span className="text-white/30 text-xs">Due {formatDate(p.dueDate)}</span>
                    <span className="text-white/50 text-sm">
                      {p.status === 'PARTIAL' && p.receivedAmount ? formatGBP(p.receivedAmount) : formatGBP(p.amount)}
                    </span>
                    <PaymentBadge status={p.status} />
                    {p.note && <span className="text-white/30 text-xs truncate max-w-[140px]">{p.note}</span>}
                  </div>
                  {p.receivedDate && (
                    <span className="shrink-0 text-white/30 text-xs">{formatDate(p.receivedDate)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Compliance & Documents section ────────────────────────────────────────────

function ComplianceSection({ propertyId }: { propertyId: string }) {
  const [docs, setDocs] = useState<PropertyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

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
    <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Compliance & Documents</p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-colors"
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
            <div key={type} className="bg-white/4 border border-white/8 rounded-xl p-3 transition-all duration-300 hover:bg-white/8 hover:border-green-500/30 hover:shadow-[0_0_0_1px_rgba(74,222,128,0.08),0_4px_20px_rgba(0,0,0,0.25)]">
              <div className="text-white/50 mb-2">{REQUIRED_DOC_ICONS[type]}</div>
              <p className="text-white text-xs font-medium leading-snug mb-1.5">{DOC_TYPE_LABELS[type]}</p>
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
      <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-3">All Documents</p>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-white/8 rounded-xl">
          <svg className="w-8 h-8 text-white/20 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-white/30 text-sm">No documents uploaded yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docs.map((doc) => {
            const ack = doc.acknowledgments[0]
            return (
              <div key={doc.id} className="bg-white/4 border border-white/8 rounded-xl p-4 flex flex-col gap-3 transition-all duration-300 hover:bg-white/8 hover:border-green-500/30 hover:shadow-[0_0_0_1px_rgba(74,222,128,0.08),0_4px_20px_rgba(0,0,0,0.25)]">
                <div className="flex items-start gap-3">
                  <FileIcon mimeType={doc.mimeType} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate" title={doc.fileName}>{doc.fileName}</p>
                    <p className="text-white/40 text-xs mt-0.5">{DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
                    <p className="text-white/30 text-xs">{formatBytes(doc.fileSize)} · {formatDate(doc.uploadedAt)}</p>
                  </div>
                </div>

                {doc.expiryDate && (
                  <div>
                    <ExpiryBadge expiryDate={doc.expiryDate} />
                  </div>
                )}

                <div className="text-xs">
                  {ack ? (
                    <span className="text-green-400">Seen by {ack.tenant.name} on {formatDate(ack.acknowledgedAt)}</span>
                  ) : (
                    <span className="text-white/30">Not yet seen by tenant</span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-white/6 pt-3">
                  <button
                    onClick={() => downloadDoc(doc.id, doc.fileName)}
                    className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
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
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setProperty(json.data)
      })
      .catch(() => setError('Failed to load property'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/50">{error ?? 'Property not found'}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-green-400 hover:text-green-300">← Back</button>
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
  // Show Applications unless tenant is active AND tenancy is active (not on notice)
  const showApplications = !(activeTenant && activeTenancy?.status === 'ACTIVE')

  return (
    <div className="p-4 lg:p-8 max-w-3xl">

      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All properties
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">{displayName}</h1>
          {property.name && <p className="text-white/40 text-sm mt-0.5">{address}</p>}
        </div>
        <StatusBadge status={property.status} config={statusConfig} />
      </div>

      {/* ── Compliance & Documents ────────────────────────────────────────── */}
      <ComplianceSection propertyId={property.id} />

      {/* ── Tenant section ──────────────────────────────────────────────────── */}
      {(() => {
        const r2rSt = currentTenant ? tenantDocStatus(currentTenant.documents, 'RIGHT_TO_RENT') : 'missing'
        const borderCls = !currentTenant ? 'border-white/8'
          : (r2rSt === 'missing' || r2rSt === 'expired') ? 'border-red-500/30'
          : TENANT_STRIP_TYPES.some((t) => tenantDocStatus(currentTenant.documents, t) !== 'valid') ? 'border-orange-500/30'
          : 'border-green-500/20'
        return (
          <div className={`bg-white/4 border ${borderCls} rounded-xl p-4 mb-5 transition-colors`}>
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Tenant</p>

            {currentTenant ? (
              <div>
                <Link
                  href={`/dashboard/properties/${property.id}/tenant/${currentTenant.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 mb-3 group"
                >
                  <div>
                    <p className="text-white font-medium group-hover:text-green-300 transition-colors">{currentTenant.name}</p>
                    <p className="text-white/50 text-sm">{currentTenant.email}</p>
                    {currentTenant.phone && <p className="text-white/40 text-xs mt-0.5">{currentTenant.phone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={currentTenant.status} config={tenantStatusConfig} />
                    <svg className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <span className="text-xs text-white/40">{TENANT_STRIP_LABELS[type]}</span>
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
              <p className="text-white/30 text-sm italic">No tenant added yet</p>
            )}
          </div>
        )
      })()}

      {/* ── Rent Payments section ───────────────────────────────────────────── */}
      {activeTenancy && <RentPaymentsSection propertyId={property.id} />}

      {/* ── Applications section ─────────────────────────────────────────────── */}
      {showApplications && <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5">
        <p className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Applications</p>

        {/* Application link */}
        <div className="mb-4">
          <p className="text-white/60 text-sm mb-2">Share this link with prospective tenants:</p>
          <div className="flex flex-wrap gap-2">
            <code className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/60 truncate font-mono">
              {applyLink}
            </code>
            <CopyButton text={applyLink} label="Copy" />
          </div>
          <div className="mt-2">
            <AppLinkEmailForm propertyId={property.id} />
          </div>
        </div>

        {/* Candidate list */}
        {candidates.length > 0 ? (
          <div className="space-y-2 mt-4 border-t border-white/8 pt-4">
            <p className="text-xs text-white/40 font-medium mb-2">Received ({candidates.length})</p>
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">{c.name}</p>
                  <p className="text-white/40 text-xs">{c.email}</p>
                </div>
                <StatusBadge status={c.status} config={tenantStatusConfig} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-sm italic mt-3">No applications yet</p>
        )}
      </div>}

    </div>
  )
}
