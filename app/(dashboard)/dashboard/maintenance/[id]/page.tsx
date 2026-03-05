'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { MaintenancePriority, MaintenanceStatus } from '@prisma/client'

interface MaintenanceDetail {
  id:          string
  title:       string
  description: string
  priority:    MaintenancePriority
  status:      MaintenanceStatus
  createdAt:   string
  resolvedAt:  string | null
  property: { id: string; name: string | null; line1: string; city: string }
  tenant:   { id: string; name: string }
}

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<MaintenanceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patching, setPatching] = useState(false)

  useEffect(() => {
    fetch(`/api/maintenance/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else setRequest(json.data)
      })
      .catch(() => setError('Failed to load request'))
      .finally(() => setLoading(false))
  }, [id])

  async function patchStatus(status: MaintenanceStatus) {
    if (!request) return
    setPatching(true)
    const res = await fetch(`/api/maintenance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (json.data) setRequest((prev) => prev ? { ...prev, ...json.data } : prev)
    setPatching(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/50">{error ?? 'Not found'}</p>
        <Link href="/dashboard/maintenance" className="mt-4 inline-block text-sm text-green-400 hover:text-green-300">
          ← Back to maintenance
        </Link>
      </div>
    )
  }

  const propertyLabel = request.property.name ?? `${request.property.line1}, ${request.property.city}`

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      {/* Back */}
      <Link
        href="/dashboard/maintenance"
        className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Maintenance requests
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityBadge[request.priority]}`}>
            {request.priority}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[request.status]}`}>
            {statusLabel[request.status]}
          </span>
          <span className="text-white/30 text-xs">Submitted {formatDate(request.createdAt)}</span>
        </div>
        <h1 className="text-white text-2xl font-bold">{request.title}</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: details */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-white/4 border border-white/8 rounded-xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Details</p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <span className="text-white/40 w-24 shrink-0">Property</span>
                <Link
                  href={`/dashboard/properties/${request.property.id}`}
                  className="text-white hover:text-green-300 transition-colors truncate"
                >
                  {propertyLabel}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 w-24 shrink-0">Tenant</span>
                <span className="text-white">{request.tenant.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/40 w-24 shrink-0">Submitted</span>
                <span className="text-white/70">{formatDateTime(request.createdAt)}</span>
              </div>
            </div>
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium mb-2">Description</p>
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{request.description}</p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="lg:w-52 shrink-0">
          <div className="bg-white/4 border border-white/8 rounded-xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Actions</p>

            {request.status === 'RESOLVED' ? (
              <div className="space-y-3">
                {request.resolvedAt && (
                  <p className="text-green-400 text-sm">
                    Resolved on {formatDate(request.resolvedAt)}
                  </p>
                )}
                <button
                  onClick={() => patchStatus('OPEN')}
                  disabled={patching}
                  className="w-full text-sm border border-white/12 text-white/50 hover:text-white hover:border-white/25 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {patching ? 'Updating…' : 'Reopen'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {request.status === 'OPEN' && (
                  <button
                    onClick={() => patchStatus('IN_PROGRESS')}
                    disabled={patching}
                    className="w-full text-sm bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {patching ? 'Updating…' : 'Mark in progress'}
                  </button>
                )}
                <button
                  onClick={() => patchStatus('RESOLVED')}
                  disabled={patching}
                  className="w-full text-sm bg-green-600 hover:bg-green-500 text-white font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {patching ? 'Updating…' : 'Mark as resolved'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
