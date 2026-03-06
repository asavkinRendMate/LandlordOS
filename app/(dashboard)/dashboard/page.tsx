import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import type { Property, PropertyDocument, Tenancy, Tenant, MaintenanceRequest, MaintenancePriority } from '@prisma/client'

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

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60)   return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)   return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)     return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type TenancyWithTenant = Tenancy & { tenant: Pick<Tenant, 'name'> | null }
type PropertyWithRelations = Property & {
  documents: PropertyDocument[]
  tenancies: TenancyWithTenant[]
}

type MaintenanceWithRelations = MaintenanceRequest & {
  property: { name: string | null; line1: string }
  tenant:   { name: string }
}

// ── Priority helpers ──────────────────────────────────────────────────────────

const priorityOrder: Record<MaintenancePriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const priorityBadge: Record<MaintenancePriority, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH:   'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW:    'bg-gray-100 text-gray-500',
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
      {/* Header */}
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

      {/* Rent / tenant */}
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

      {/* Compliance strip */}
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

// ── Maintenance preview row ───────────────────────────────────────────────────

function MaintenanceRow({ req }: { req: MaintenanceWithRelations }) {
  const propertyLabel = req.property.name ?? req.property.line1
  return (
    <Link
      href={`/dashboard/maintenance/${req.id}`}
      className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-4 px-4 transition-colors"
    >
      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityBadge[req.priority]}`}>
        {req.priority}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[#1A1A1A] text-sm font-medium truncate">{req.title}</p>
        <p className="text-[#9CA3AF] text-xs truncate">{propertyLabel} · {req.tenant.name}</p>
      </div>
      <span className="shrink-0 text-[#9CA3AF] text-xs">{timeAgo(new Date(req.createdAt))}</span>
      <svg className="w-4 h-4 text-[#D1D5DB] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>
}) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { as: asMode } = await searchParams

  const [properties, openRequests] = await Promise.all([
    prisma.property.findMany({
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
    }),
    prisma.maintenanceRequest.findMany({
      where: { property: { userId: user.id }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: {
        property: { select: { name: true, line1: true } },
        tenant:   { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  if (properties.length === 0) {
    if (asMode === 'landlord') redirect('/dashboard/onboarding')
    const tenantProfile = await prisma.tenant.findFirst({
      where: { email: user.email!, status: { in: ['TENANT', 'INVITED'] } },
      select: { id: true },
    })
    redirect(tenantProfile ? '/tenant/dashboard' : '/dashboard/onboarding')
  }

  // Sort maintenance by priority then date
  const topRequests = [...openRequests]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3) as MaintenanceWithRelations[]

  // Expiring compliance alerts (within 30 days) — now from PropertyDocument
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

      {/* Maintenance preview */}
      <div className="bg-white border border-black/[0.06] rounded-xl p-4 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">Active Maintenance</p>
          <Link href="/dashboard/maintenance" className="text-xs text-[#16a34a] hover:text-[#15803d] transition-colors">
            View all →
          </Link>
        </div>
        {topRequests.length === 0 ? (
          <p className="text-[#9CA3AF] text-sm italic py-2">No active maintenance requests</p>
        ) : (
          <div>
            {topRequests.map((req) => (
              <MaintenanceRow key={req.id} req={req} />
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
        <h1 className="text-[#1A1A1A] text-xl font-semibold">Properties</h1>
        <Link
          href="/dashboard/properties"
          className="text-xs text-[#6B7280] hover:text-[#374151] transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* Grid — 1 col mobile, 2 col sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>

      {/* Add property */}
      <div className="mt-4">
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
    </div>
  )
}
