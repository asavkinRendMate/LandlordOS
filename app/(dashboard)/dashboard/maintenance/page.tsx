import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAuthClient } from '@/lib/supabase/auth'
import { prisma } from '@/lib/prisma'
import type { MaintenanceRequest, MaintenancePriority, MaintenanceStatus } from '@prisma/client'

type RequestWithRelations = MaintenanceRequest & {
  property: { name: string | null; line1: string; city: string }
  tenant:   { name: string }
  _count:   { photos: number }
}

const priorityOrder: Record<MaintenancePriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const priorityBadge: Record<MaintenancePriority, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH:   'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW:    'bg-gray-100 text-gray-500',
}

const statusBadge: Record<MaintenanceStatus, string> = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED:    'bg-green-100 text-green-700',
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

function timeAgo(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1 week ago'
  if (weeks < 5) return `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
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
      _count:   { select: { photos: true } },
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
    <div className="p-4 lg:p-8 max-w-3xl animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[#1A1A1A] text-xl font-semibold">Maintenance Requests</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(({ label, value }) => {
          const isActive = statusFilter === value || (!statusFilter && value === undefined)
          const href = value ? `?status=${value}` : '/dashboard/maintenance'
          const count = value ? tabCounts[value] : tabCounts.all
          return (
            <Link
              key={label}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#9CA3AF] hover:text-[#6B7280]'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${isActive ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="bg-white border border-black/[0.06] rounded-xl p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[#9CA3AF] text-sm italic">No {statusFilter?.toLowerCase().replace('_', ' ') ?? ''} maintenance requests</p>
        </div>
      ) : (
        <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)]">
          {sorted.map((req, i) => {
            const propertyLabel = req.property.name ?? `${req.property.line1}, ${req.property.city}`
            return (
              <Link
                key={req.id}
                href={`/dashboard/maintenance/${req.id}`}
                className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityBadge[req.priority]}`}>
                  {req.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1A1A1A] text-sm font-medium truncate">{req.title}</p>
                  <p className="text-[#6B7280] text-xs truncate">{propertyLabel} · {req.tenant.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[req.status]}`}>
                    {statusLabel[req.status]}
                  </span>
                  {req._count.photos > 0 && (
                    <span className="hidden sm:flex items-center gap-0.5 text-[#9CA3AF] text-xs">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {req._count.photos}
                    </span>
                  )}
                  <span className="text-[#9CA3AF] text-xs hidden sm:block">{timeAgo(req.createdAt)}</span>
                  <svg className="w-4 h-4 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
