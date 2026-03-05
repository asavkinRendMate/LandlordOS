import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import type { Property, PropertyDocument, Tenancy, Tenant } from '@prisma/client'

// ── Status helpers ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  VACANT:           { label: 'Vacant',                dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-500' },
  APPLICATION_OPEN: { label: 'Accepting applications', dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700' },
  OFFER_ACCEPTED:   { label: 'Offer accepted',         dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800' },
  ACTIVE:           { label: 'Active',                 dot: 'bg-green-400',  badge: 'bg-green-100 text-green-700' },
  NOTICE_GIVEN:     { label: 'Notice given',           dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700' },
}

const statusTopBorder: Record<string, string> = {
  ACTIVE:           'border-t-green-500',
  VACANT:           'border-t-gray-300',
  APPLICATION_OPEN: 'border-t-blue-400',
  OFFER_ACCEPTED:   'border-t-yellow-400',
  NOTICE_GIVEN:     'border-t-amber-400',
}

const complianceLabels: Record<string, string> = {
  GAS_SAFETY:  'Gas',
  EPC:         'EPC',
  EICR:        'EICR',
  HOW_TO_RENT: 'H2R',
}

function getComplianceColor(docs: PropertyDocument[], type: string): string {
  const matches = docs.filter((d) => d.documentType === type)
  if (!matches.length) return 'bg-gray-300'
  const best = [...matches].sort((a, b) => {
    const tA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
    const tB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
    return tB - tA
  })[0]
  if (!best.expiryDate) return 'bg-green-400'
  const now = Date.now()
  const expiry = new Date(best.expiryDate).getTime()
  if (expiry < now) return 'bg-red-500'
  if (expiry - now < 30 * 86400000) return 'bg-yellow-400'
  return 'bg-green-400'
}

function formatRent(pence: number | null): string {
  if (!pence) return '—'
  return `£${(pence / 100).toLocaleString('en-GB')}/mo`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TenancyWithTenant = Tenancy & { tenant: Pick<Tenant, 'name'> | null }
type PropertyWithRelations = Property & {
  documents: PropertyDocument[]
  tenancies: TenancyWithTenant[]
}

// ── Property card ─────────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: PropertyWithRelations }) {
  const config = statusConfig[property.status] ?? statusConfig.VACANT
  const activeTenancy = property.tenancies[0] ?? null
  const docTypes = ['GAS_SAFETY', 'EPC', 'EICR', 'HOW_TO_RENT'] as const
  const topBorder = statusTopBorder[property.status] ?? 'border-t-gray-300'

  return (
    <Link
      href={`/dashboard/properties/${property.id}`}
      className={`block bg-white border border-black/[0.06] border-t-[3px] ${topBorder} rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-px transition-all duration-150`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[#1A1A1A] font-medium text-sm leading-snug truncate">
            {property.name ?? property.line1}
          </p>
          <p className="text-[#9CA3AF] text-xs mt-0.5 truncate">
            {property.name ? `${property.line1}, ` : ''}{property.city}, {property.postcode}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${config.badge}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${config.dot} mr-1.5 align-middle`} />
          {config.label}
        </span>
      </div>

      <p className="text-[#6B7280] text-xs mb-3 truncate">
        {activeTenancy ? (
          <>
            <span className="text-[#374151] font-medium">{formatRent(activeTenancy.monthlyRent)}</span>
            {activeTenancy.tenant?.name && <span className="ml-1.5">· {activeTenancy.tenant.name}</span>}
          </>
        ) : (
          <span className="text-[#9CA3AF] italic">No active tenancy</span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {docTypes.map((type) => {
          const color = getComplianceColor(property.documents, type)
          return (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
              <span className="text-xs text-[#9CA3AF]">{complianceLabels[type]}</span>
            </div>
          )
        })}
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PropertiesPage() {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      documents: true,
      tenancies: {
        where: { status: { not: 'ENDED' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { tenant: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Expiring compliance alerts (within 30 days)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const complianceDocTypes = new Set(['GAS_SAFETY', 'EPC', 'EICR'])
  const alerts = properties.flatMap((p) =>
    p.documents
      .filter((d) => complianceDocTypes.has(d.documentType) && d.expiryDate && d.expiryDate > now && d.expiryDate <= in30)
      .map((d) => ({
        property: p.name ?? `${p.line1}, ${p.city}`,
        type: complianceLabels[d.documentType] ?? d.documentType,
        expiryDate: d.expiryDate!,
      })),
  )

  return (
    <div className="p-4 lg:p-8">
      {/* Alert bar */}
      {alerts.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          {alerts.map((a, i) => (
            <p key={i} className="text-amber-700 text-sm">
              <span className="font-medium">{a.type} certificate</span> expires{' '}
              {a.expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {a.property}
            </p>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <h1 className="text-[#1A1A1A] text-xl font-semibold">My Properties</h1>
        <Link
          href="/dashboard/properties/new"
          className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <p className="text-[#9CA3AF] text-sm mb-4">No properties yet</p>
          <Link
            href="/dashboard/properties/new"
            className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
          >
            Add your first property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  )
}
