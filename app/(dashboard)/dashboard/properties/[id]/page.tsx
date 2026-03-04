'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const complianceLabels: Record<string, string> = {
  GAS_SAFETY: 'Gas Safety',
  EPC: 'EPC',
  EICR: 'EICR',
  HOW_TO_RENT: 'How to Rent',
}

function StatusBadge({ status, config }: { status: string; config: typeof statusConfig }) {
  const c = config[status] ?? { label: status, cls: 'bg-white/10 text-white/40' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.cls}`}>{c.label}</span>
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

// ── Compliance strip ──────────────────────────────────────────────────────────

function ComplianceStrip({ docs }: { docs: ComplianceDoc[] }) {
  const docTypes = ['GAS_SAFETY', 'EPC', 'EICR', 'HOW_TO_RENT'] as const

  function color(type: string) {
    const doc = docs.find((d) => d.type === type)
    if (!doc) return 'bg-white/20'
    if (type === 'HOW_TO_RENT') return doc.issued ? 'bg-green-400' : 'bg-white/20'
    switch (doc.status) {
      case 'VALID': return 'bg-green-400'
      case 'EXPIRING': return 'bg-yellow-400'
      case 'EXPIRED': return 'bg-red-500'
      default: return 'bg-white/20'
    }
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {docTypes.map((type) => (
        <div key={type} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full shrink-0 ${color(type)}`} />
          <span className="text-sm text-white/50">{complianceLabels[type]}</span>
        </div>
      ))}
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

      {/* Compliance strip */}
      <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5">
        <p className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Compliance</p>
        <ComplianceStrip docs={property.complianceDocs} />
      </div>

      {/* ── Tenant section ──────────────────────────────────────────────────── */}
      <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5">
        <p className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Tenant</p>

        {currentTenant ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-white font-medium">{currentTenant.name}</p>
                <p className="text-white/50 text-sm">{currentTenant.email}</p>
                {currentTenant.phone && <p className="text-white/40 text-xs mt-0.5">{currentTenant.phone}</p>}
              </div>
              <StatusBadge status={currentTenant.status} config={tenantStatusConfig} />
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <SendInviteButton tenantId={currentTenant.id} />
              {portalLink && <CopyButton text={portalLink} label="Copy portal link" />}
            </div>
          </div>
        ) : (
          <p className="text-white/30 text-sm italic">No tenant added yet</p>
        )}
      </div>

      {/* ── Applications section ─────────────────────────────────────────────── */}
      <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-5">
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
      </div>

    </div>
  )
}
