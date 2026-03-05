import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import type { MaintenanceRequest, MaintenancePriority, MaintenanceStatus } from '@prisma/client'

type RequestWithRelations = MaintenanceRequest & {
  property: { name: string | null; line1: string; city: string }
  tenant:   { name: string }
}

const priorityOrder: Record<MaintenancePriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const priorityBadge: Record<MaintenancePriority, string> = {
  URGENT: 'bg-red-500/20 text-red-300',
  HIGH:   'bg-orange-500/20 text-orange-300',
  MEDIUM: 'bg-yellow-500/20 text-yellow-300',
  LOW:    'bg-white/8 text-white/40',
}

const statusBadge: Record<MaintenanceStatus, string> = {
  OPEN:        'bg-blue-500/15 text-blue-300',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-300',
  RESOLVED:    'bg-green-500/15 text-green-300',
}

const statusLabel: Record<MaintenanceStatus, string> = {
  OPEN:        'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED:    'Resolved',
}

const TABS = [
  { label: 'All',         value: undefined },
  { label: 'Open',        value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved',    value: 'RESOLVED' },
] as const

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; propertyId?: string }>
}) {
  const supabase = createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { status: statusFilter, propertyId: propertyFilter } = await searchParams

  const allRequests = await prisma.maintenanceRequest.findMany({
    where: {
      property: { userId: user.id },
      ...(propertyFilter ? { propertyId: propertyFilter } : {}),
    },
    include: {
      property: { select: { name: true, line1: true, city: true } },
      tenant:   { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  }) as RequestWithRelations[]

  const filtered = statusFilter
    ? allRequests.filter((r) => r.status === statusFilter)
    : allRequests

  const sorted = [...filtered].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.createdAt.getTime() - a.createdAt.getTime(),
  )

  const tabCounts: Record<string, number> = {
    all:         allRequests.length,
    OPEN:        allRequests.filter((r) => r.status === 'OPEN').length,
    IN_PROGRESS: allRequests.filter((r) => r.status === 'IN_PROGRESS').length,
    RESOLVED:    allRequests.filter((r) => r.status === 'RESOLVED').length,
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-xl font-semibold">Maintenance Requests</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-white/4 rounded-lg p-1 w-fit">
        {TABS.map(({ label, value }) => {
          const isActive = statusFilter === value || (!statusFilter && value === undefined)
          const href = value ? `?status=${value}` : '/dashboard/maintenance'
          const count = value ? tabCounts[value] : tabCounts.all
          return (
            <Link
              key={label}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? 'text-white/60' : 'text-white/25'}`}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="bg-white/4 border border-white/8 rounded-xl p-8 text-center">
          <p className="text-white/30 text-sm italic">No {statusFilter?.toLowerCase().replace('_', ' ') ?? ''} maintenance requests</p>
        </div>
      ) : (
        <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
          {sorted.map((req, i) => {
            const propertyLabel = req.property.name ?? `${req.property.line1}, ${req.property.city}`
            return (
              <Link
                key={req.id}
                href={`/dashboard/maintenance/${req.id}`}
                className={`flex items-center gap-3 p-4 hover:bg-white/4 transition-colors ${i > 0 ? 'border-t border-white/6' : ''}`}
              >
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityBadge[req.priority]}`}>
                  {req.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{req.title}</p>
                  <p className="text-white/40 text-xs truncate">{propertyLabel} · {req.tenant.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[req.status]}`}>
                    {statusLabel[req.status]}
                  </span>
                  <span className="text-white/30 text-xs hidden sm:block">{formatDate(req.createdAt)}</span>
                  <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
