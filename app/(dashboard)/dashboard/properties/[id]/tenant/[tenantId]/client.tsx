'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import DocumentUploadModal from '@/components/shared/DocumentUploadModal'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantDoc {
  id: string
  documentType: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  expiryDate: string | null
  note: string | null
}

interface TenantWithDocs {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  propertyId: string
  property: {
    id: string
    name: string | null
    line1: string
  }
  documents: TenantDoc[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
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

const ALL_DOC_TYPES = Object.entries(DOC_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const REQUIRED_TYPES = ['RIGHT_TO_RENT', 'PASSPORT', 'PROOF_OF_INCOME', 'BANK_STATEMENTS', 'EMPLOYER_REFERENCE', 'PREVIOUS_LANDLORD_REFERENCE']
const OTHER_TYPES = ['GUARANTOR_AGREEMENT', 'PET_AGREEMENT', 'OTHER']
const EXPIRY_TYPES = ['RIGHT_TO_RENT', 'PASSPORT']

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  CANDIDATE:    { label: 'Applied',       cls: 'bg-blue-100 text-blue-700' },
  INVITED:      { label: 'Invited',       cls: 'bg-yellow-100 text-yellow-800' },
  TENANT:       { label: 'Active tenant', cls: 'bg-green-100 text-green-700' },
  FORMER_TENANT:{ label: 'Former tenant', cls: 'bg-gray-100 text-gray-500' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Doc row ───────────────────────────────────────────────────────────────────

function DocRow({
  type,
  docs,
  onUpload,
  onDownload,
  onDelete,
}: {
  type: string
  docs: TenantDoc[]
  onUpload: (type: string) => void
  onDownload: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#1A1A1A] text-sm font-medium">{DOC_TYPE_LABELS[type]}</span>
          {docs.length > 0 ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Uploaded</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Missing</span>
          )}
        </div>
        {docs.map((doc) => (
          <div key={doc.id} className="mt-1 flex items-center gap-2 text-xs text-[#9CA3AF]">
            <span className="truncate max-w-[200px]">{doc.fileName}</span>
            <span>· {formatBytes(doc.fileSize)}</span>
            {doc.expiryDate && <span>· expires {formatDate(doc.expiryDate)}</span>}
            <button
              onClick={() => onDownload(doc.id, doc.fileName)}
              className="text-[#16a34a] hover:text-[#15803d] transition-colors"
              title="Download"
            >
              ↓
            </button>
            <button
              onClick={() => onDelete(doc.id)}
              className="text-[#9CA3AF] hover:text-red-500 transition-colors"
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onUpload(type)}
        className="shrink-0 text-xs bg-gray-100 hover:bg-gray-200 text-[#6B7280] px-2.5 py-1 rounded-lg transition-colors"
      >
        Upload
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TenantDetailClient({
  tenant: initialTenant,
  propertyId,
}: {
  tenant: TenantWithDocs
  propertyId: string
}) {
  const [tenant, setTenant] = useState(initialTenant)
  const [docs, setDocs] = useState<TenantDoc[]>(initialTenant.documents)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(initialTenant.name)
  const [editEmail, setEditEmail] = useState(initialTenant.email)
  const [editPhone, setEditPhone] = useState(initialTenant.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [preselectedType, setPreselectedType] = useState('')

  const loadDocs = useCallback(async () => {
    const res = await fetch(`/api/tenant-documents?tenantId=${tenant.id}`)
    const json = await res.json()
    if (json.data) setDocs(json.data)
  }, [tenant.id])

  async function saveEdit() {
    setSaving(true)
    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone || null }),
    })
    if (res.ok) {
      const json = await res.json()
      setTenant((prev) => ({ ...prev, ...json.data }))
      setEditing(false)
    }
    setSaving(false)
  }

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

  async function deleteDoc(docId: string) {
    const res = await fetch(`/api/tenant-documents/${docId}`, { method: 'DELETE' })
    if (res.ok) loadDocs()
  }

  function openUpload(type = '') {
    setPreselectedType(type)
    setShowUpload(true)
  }

  // R2R status — pick the doc with the latest expiry (no expiry = Infinity)
  const r2rDocs = docs.filter((d) => d.documentType === 'RIGHT_TO_RENT')
  const r2rDoc = r2rDocs.length === 0 ? null : [...r2rDocs].sort((a, b) => {
    const tA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
    const tB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
    return tB - tA
  })[0]
  const r2rStatus = (() => {
    if (!r2rDoc) return 'missing'
    if (r2rDoc.expiryDate) {
      const days = Math.ceil((new Date(r2rDoc.expiryDate).getTime() - Date.now()) / 86400000)
      if (days < 0) return 'expired'
      if (days <= 30) return 'expiring'
    }
    return 'valid'
  })()

  const displayName = tenant.property.name ?? tenant.property.line1
  const statusCfg = STATUS_CONFIG[tenant.status] ?? { label: tenant.status, cls: 'bg-gray-100 text-gray-500' }

  const r2rBoxCls = r2rStatus === 'valid'
    ? 'bg-green-500/10 border-green-500/30'
    : r2rStatus === 'expiring'
    ? 'bg-orange-500/10 border-orange-500/30'
    : 'bg-red-500/10 border-red-500/30'

  const r2rTextCls = r2rStatus === 'valid' ? 'text-green-600'
    : r2rStatus === 'expiring' ? 'text-orange-500' : 'text-red-600'

  const r2rLabel = r2rStatus === 'valid' ? 'Valid'
    : r2rStatus === 'expiring' ? 'Expiring soon'
    : r2rStatus === 'expired' ? 'Expired' : 'Missing'

  const editInputClass =
    'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[#1A1A1A] placeholder-gray-400 text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors'

  return (
    <div className="p-4 lg:p-8 max-w-3xl">

      {/* Back */}
      <Link
        href={`/dashboard/properties/${propertyId}`}
        className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to {displayName}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[#1A1A1A] text-2xl font-bold">{tenant.name}</h1>
          <p className="text-[#9CA3AF] text-sm mt-0.5">{tenant.email}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.cls}`}>{statusCfg.label}</span>
      </div>

      {/* R2R status box */}
      <div className={`border rounded-xl p-4 mb-5 ${r2rBoxCls}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Right to Rent Check</p>
          <span className={`text-sm font-semibold ${r2rTextCls}`}>{r2rLabel}</span>
        </div>
        {r2rDoc ? (
          <div className="text-sm text-[#374151]">
            <p>{r2rDoc.fileName}</p>
            {r2rDoc.expiryDate && <p className="text-xs mt-0.5 text-[#6B7280]">Expires {formatDate(r2rDoc.expiryDate)}</p>}
          </div>
        ) : (
          <p className="text-sm text-[#6B7280]">No Right to Rent document uploaded.</p>
        )}
        <button
          onClick={() => openUpload('RIGHT_TO_RENT')}
          className="mt-3 text-sm bg-gray-100 hover:bg-gray-200 text-[#6B7280] px-3 py-1.5 rounded-lg transition-colors"
        >
          {r2rDoc ? 'Upload new document' : 'Upload R2R document'}
        </button>
      </div>

      {/* Tenant details */}
      <div className="bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Tenant Details</p>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setEditName(tenant.name); setEditEmail(tenant.email); setEditPhone(tenant.phone ?? '') }}
              className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1">Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={editInputClass}
              />
            </div>
            <div>
              <label className="text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className={editInputClass}
              />
            </div>
            <div>
              <label className="text-[10px] text-[#9CA3AF] uppercase tracking-wide block mb-1">Phone</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className={editInputClass}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors px-2">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[#6B7280] text-sm w-14 shrink-0">Name</span>
              <span className="text-[#1A1A1A] text-sm">{tenant.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#6B7280] text-sm w-14 shrink-0">Email</span>
              <span className="text-[#1A1A1A] text-sm break-all">{tenant.email}</span>
            </div>
            {tenant.phone && (
              <div className="flex items-center gap-3">
                <span className="text-[#6B7280] text-sm w-14 shrink-0">Phone</span>
                <span className="text-[#1A1A1A] text-sm">{tenant.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Required Documents */}
      <div className="bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Required Documents</p>
          <button
            onClick={() => openUpload()}
            className="flex items-center gap-1.5 text-sm bg-[#16a34a] hover:bg-[#15803d] text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload
          </button>
        </div>
        <div>
          {REQUIRED_TYPES.map((type) => (
            <DocRow
              key={type}
              type={type}
              docs={docs.filter((d) => d.documentType === type)}
              onUpload={openUpload}
              onDownload={downloadDoc}
              onDelete={deleteDoc}
            />
          ))}
        </div>
      </div>

      {/* Other Documents */}
      <div className="bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Other Documents</p>
          <button
            onClick={() => openUpload()}
            className="flex items-center gap-1.5 text-sm bg-[#16a34a] hover:bg-[#15803d] text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload
          </button>
        </div>
        <div>
          {OTHER_TYPES.map((type) => (
            <DocRow
              key={type}
              type={type}
              docs={docs.filter((d) => d.documentType === type)}
              onUpload={openUpload}
              onDownload={downloadDoc}
              onDelete={deleteDoc}
            />
          ))}
        </div>
      </div>

      <DocumentUploadModal
        isOpen={showUpload}
        onClose={() => { setShowUpload(false); setPreselectedType('') }}
        onUploaded={loadDocs}
        uploadEndpoint="/api/tenant-documents/upload"
        extraFields={{ tenantId: tenant.id }}
        documentTypes={ALL_DOC_TYPES}
        expiryDateTypes={EXPIRY_TYPES}
        preselectedType={preselectedType}
        title="Upload Tenant Document"
      />
    </div>
  )
}
