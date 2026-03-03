import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import type { ComplianceDoc, Property, Tenancy } from '@prisma/client'

// ── Status helpers ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  VACANT: { label: 'Vacant', dot: 'bg-white/30', badge: 'bg-white/10 text-white/50' },
  APPLICATION_OPEN: { label: 'Accepting applications', dot: 'bg-blue-400', badge: 'bg-blue-500/15 text-blue-300' },
  OFFER_ACCEPTED: { label: 'Offer accepted', dot: 'bg-yellow-400', badge: 'bg-yellow-500/15 text-yellow-300' },
  ACTIVE: { label: 'Active', dot: 'bg-green-400', badge: 'bg-green-500/15 text-green-300' },
  NOTICE_GIVEN: { label: 'Notice given', dot: 'bg-orange-400', badge: 'bg-orange-500/15 text-orange-300' },
}

const complianceLabels: Record<string, string> = {
  GAS_SAFETY: 'Gas',
  EPC: 'EPC',
  EICR: 'EICR',
  HOW_TO_RENT: 'H2R',
}

function complianceColor(doc: ComplianceDoc): string {
  if (doc.type === 'HOW_TO_RENT') return doc.issued ? 'bg-green-400' : 'bg-white/20'
  switch (doc.status) {
    case 'VALID': return 'bg-green-400'
    case 'EXPIRING': return 'bg-yellow-400'
    case 'EXPIRED': return 'bg-red-500'
    default: return 'bg-white/20'
  }
}

function formatRent(pence: number | null): string {
  if (!pence) return '—'
  return `£${(pence / 100).toLocaleString('en-GB')}/mo`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PropertyWithRelations = Property & {
  complianceDocs: ComplianceDoc[]
  tenancies: Tenancy[]
}

// ── Property card ─────────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: PropertyWithRelations }) {
  const config = statusConfig[property.status] ?? statusConfig.VACANT
  const activeTenancy = property.tenancies[0] ?? null
  const docTypes = ['GAS_SAFETY', 'EPC', 'EICR', 'HOW_TO_RENT'] as const

  return (
    <Link
      href={`/dashboard/properties/${property.id}`}
      className="block bg-white/4 border border-white/8 rounded-xl p-4 hover:bg-white/6 hover:border-white/14 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-white font-medium text-sm leading-snug truncate">
            {property.name ?? property.line1}
          </p>
          <p className="text-white/40 text-xs mt-0.5 truncate">
            {property.name ? `${property.line1}, ` : ''}{property.city}, {property.postcode}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${config.badge}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${config.dot} mr-1.5 align-middle`} />
          {config.label}
        </span>
      </div>

      {/* Rent / tenant */}
      <p className="text-white/60 text-xs mb-3 truncate">
        {activeTenancy ? (
          <>
            <span className="text-white/80 font-medium">{formatRent(activeTenancy.monthlyRent)}</span>
            {activeTenancy.tenantName && <span className="ml-1.5">· {activeTenancy.tenantName}</span>}
          </>
        ) : (
          <span className="text-white/30 italic">No active tenancy</span>
        )}
      </p>

      {/* Compliance strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {docTypes.map((type) => {
          const doc = property.complianceDocs.find((d) => d.type === type)
          const color = doc ? complianceColor(doc) : 'bg-white/20'
          return (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
              <span className="text-xs text-white/30">{complianceLabels[type]}</span>
            </div>
          )
        })}
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      complianceDocs: true,
      tenancies: {
        where: { status: { not: 'ENDED' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (properties.length === 0) redirect('/dashboard/onboarding')

  // Expiring compliance alerts (within 30 days)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const alerts = properties.flatMap((p) =>
    p.complianceDocs
      .filter((d) => d.expiryDate && d.expiryDate > now && d.expiryDate <= in30 && d.type !== 'HOW_TO_RENT')
      .map((d) => ({
        property: p.name ?? `${p.line1}, ${p.city}`,
        type: complianceLabels[d.type],
        expiryDate: d.expiryDate!,
      })),
  )

  return (
    <div className="p-4 lg:p-8">
      {/* Alert bar */}
      {alerts.length > 0 && (
        <div className="mb-5 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3 space-y-1">
          {alerts.map((a, i) => (
            <p key={i} className="text-yellow-300 text-sm">
              <span className="font-medium">{a.type} certificate</span> expires{' '}
              {a.expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {a.property}
            </p>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-white text-xl font-semibold">Properties</h1>
        <Link
          href="/dashboard/properties/new"
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add property
        </Link>
      </div>

      {/* Grid — 1 col mobile, 2 col sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </div>
  )
}
