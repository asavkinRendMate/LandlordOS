'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { MaintenancePriority, MaintenanceStatus } from '@prisma/client'
import { compressImage } from '@/lib/image-utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatusHistory {
  id: string
  fromStatus: MaintenanceStatus | null
  toStatus: MaintenanceStatus
  changedBy: string
  changedAt: string
  note: string | null
}

interface Photo {
  id: string
  role: string
  fileName: string
  fileSize: number
  uploadedAt: string
  caption: string | null
  signedUrl: string | null
}

interface MaintenanceDetail {
  id:           string
  title:        string
  description:  string
  priority:     MaintenancePriority
  status:       MaintenanceStatus
  createdAt:    string
  inProgressAt: string | null
  resolvedAt:   string | null
  property:     { id: string; name: string | null; line1: string; city: string }
  tenant:       { id: string; name: string }
  statusHistory: StatusHistory[]
  photos:        Photo[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved',
}

const STATUS_DOT: Record<MaintenanceStatus, string> = {
  OPEN:        'bg-blue-400',
  IN_PROGRESS: 'bg-amber-400',
  RESOLVED:    'bg-green-400',
}

function fmtDT(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function ageLabel(from: string): string {
  const days = Math.floor((Date.now() - new Date(from).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

// ── Photo lightbox ────────────────────────────────────────────────────────────

function Lightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: Photo[]
  startIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIndex)
  const photo = photos[idx]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(photos.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, photos.length])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        {photo.signedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.signedUrl}
            alt={photo.caption ?? photo.fileName}
            className="max-h-[80vh] mx-auto rounded-xl object-contain w-full"
          />
        )}

        {/* Caption */}
        {photo.caption && (
          <p className="text-center text-white/60 text-sm mt-3">{photo.caption}</p>
        )}

        {/* Nav */}
        {photos.length > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="text-white/40 hover:text-white disabled:opacity-20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-white/40 text-sm">{idx + 1} / {photos.length}</span>
            <button
              onClick={() => setIdx((i) => Math.min(photos.length - 1, i + 1))}
              disabled={idx === photos.length - 1}
              className="text-white/40 hover:text-white disabled:opacity-20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Photo grid ────────────────────────────────────────────────────────────────

function PhotoGrid({
  photos,
  onDelete,
}: {
  photos: Photo[]
  onDelete?: (id: string) => void
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  if (photos.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.id} className="relative group rounded-xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square">
            {p.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.signedUrl}
                alt={p.caption ?? p.fileName}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxIdx(i)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#9CA3AF] text-xs">No preview</div>
            )}
            {p.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-white text-xs truncate">{p.caption}</p>
              </div>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(p.id)}
                className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
                title="Delete photo"
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {lightboxIdx !== null && (
        <Lightbox photos={photos} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  )
}

// ── Resolve modal ─────────────────────────────────────────────────────────────

const MODAL_ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MODAL_MAX_SIZE = 10 * 1024 * 1024
const MODAL_MAX_PHOTOS = 10

function ResolveModal({
  requestId,
  onConfirm,
  onClose,
}: {
  requestId: string
  onConfirm: (note: string) => Promise<void>
  onClose: () => void
}) {
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string; caption: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | null) {
    if (!files) return
    const added: typeof photos = []
    for (const file of Array.from(files)) {
      if (!MODAL_ALLOWED.includes(file.type)) continue
      if (file.size > MODAL_MAX_SIZE) continue
      if (photos.length + added.length >= MODAL_MAX_PHOTOS) break
      added.push({ file, preview: URL.createObjectURL(file), caption: '' })
    }
    setPhotos((prev) => [...prev, ...added])
  }

  function removePhoto(i: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  function updateCaption(i: number, caption: string) {
    setPhotos((prev) => prev.map((p, idx) => idx === i ? { ...p, caption } : p))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }

  async function uploadPhotos() {
    for (const p of photos) {
      const compressed = await compressImage(p.file)
      const fd = new FormData()
      fd.append('file', compressed)
      fd.append('role', 'LANDLORD')
      if (p.caption) fd.append('caption', p.caption)
      await fetch(`/api/maintenance/${requestId}/photos`, { method: 'POST', body: fd }).catch(console.error)
    }
    photos.forEach((p) => URL.revokeObjectURL(p.preview))
  }

  async function confirm(skipPhotos: boolean) {
    setSubmitting(true)
    if (!skipPhotos && photos.length > 0) await uploadPhotos()
    await onConfirm(note)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-black/[0.06] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-[#1A1A1A] font-semibold text-base">Mark as resolved</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Subtext */}
          <p className="text-[#6B7280] text-sm leading-relaxed">
            Would you like to attach proof photos before closing this request?
            This helps document the fix and protects you if any disputes arise.
          </p>

          {/* Photo upload */}
          <div>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-2">
              Attach proof photos <span className="normal-case text-[#9CA3AF] font-normal">(optional)</span>
            </p>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border border-dashed border-gray-200 hover:border-[#16a34a]/40 rounded-xl p-4 text-center cursor-pointer transition-colors"
            >
              <svg className="w-6 h-6 text-[#9CA3AF] mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-[#6B7280] text-sm">Drop photos here or click to select</p>
              <p className="text-[#9CA3AF] text-xs mt-0.5">JPEG, PNG, WebP · max 10MB · up to {MODAL_MAX_PHOTOS} photos</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {photos.map((p, i) => (
                  <div key={i} className="relative group">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto(i) }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={p.caption}
                      onChange={(e) => updateCaption(i, e.target.value)}
                      placeholder="Caption…"
                      className="mt-1 w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-[#16a34a]/40"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-2">
              Note <span className="normal-case text-[#9CA3AF] font-normal">(optional)</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Plumber fixed the leak, new pipes installed"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[#1A1A1A] text-sm placeholder-gray-400 focus:outline-none focus:border-[#16a34a]/50 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => confirm(false)}
              disabled={submitting}
              className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              {submitting
                ? (photos.length > 0 ? 'Uploading photos…' : 'Closing request…')
                : 'Confirm & close request'}
            </button>
            <button
              onClick={() => confirm(true)}
              disabled={submitting}
              className="w-full border border-gray-200 text-[#6B7280] hover:text-[#1A1A1A] hover:border-gray-300 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
            >
              I&apos;ll add photos later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<MaintenanceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patching, setPatching] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)

  // Load request details + signed photo URLs in parallel
  const loadAll = useCallback(async () => {
    try {
      const [reqRes, photosRes] = await Promise.all([
        fetch(`/api/maintenance/${id}`),
        fetch(`/api/maintenance/${id}/photos`),
      ])
      const [reqJson, photosJson] = await Promise.all([reqRes.json(), photosRes.json()])
      if (reqJson.error) {
        setError(reqJson.error)
      } else {
        setRequest({ ...reqJson.data, photos: photosJson.data ?? reqJson.data.photos ?? [] })
      }
    } catch {
      setError('Failed to load request')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Refresh only photos (used after upload / delete)
  const loadPhotos = useCallback(async () => {
    const res = await fetch(`/api/maintenance/${id}/photos`)
    const json = await res.json()
    if (json.data) {
      setRequest((prev) => prev ? { ...prev, photos: json.data } : prev)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  async function patchStatus(status: MaintenanceStatus, noteText = '') {
    if (!request) return
    setPatching(true)
    const res = await fetch(`/api/maintenance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note: noteText.trim() || undefined }),
    })
    const json = await res.json()
    if (json.data) {
      setRequest((prev) => prev ? {
        ...prev,
        ...json.data,
        statusHistory: [
          ...(prev.statusHistory ?? []),
          {
            id: Math.random().toString(),
            fromStatus: prev.status,
            toStatus: status,
            changedBy: 'you',
            changedAt: new Date().toISOString(),
            note: noteText.trim() || null,
          },
        ],
      } : prev)
    }
    setPatching(false)
  }

  async function handleResolveConfirm(note: string) {
    await patchStatus('RESOLVED', note)
    setShowResolveModal(false)
    loadPhotos()
  }

  async function deletePhoto(photoId: string) {
    await fetch(`/api/maintenance/${id}/photos/${photoId}`, { method: 'DELETE' })
    setRequest((prev) => prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== photoId) } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#6B7280]">{error ?? 'Not found'}</p>
        <Link href="/dashboard/maintenance" className="mt-4 inline-block text-sm text-[#16a34a] hover:text-[#15803d]">
          ← Back to maintenance
        </Link>
      </div>
    )
  }

  const propertyLabel = request.property.name ?? `${request.property.line1}, ${request.property.city}`
  const tenantPhotos = request.photos.filter((p) => p.role === 'TENANT')
  const landlordPhotos = request.photos.filter((p) => p.role === 'LANDLORD')

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/dashboard/maintenance"
        className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors mb-6"
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
          <span className="text-[#9CA3AF] text-xs">
            Submitted {fmtDate(request.createdAt)} · open for {ageLabel(request.createdAt)}
          </span>
        </div>
        <h1 className="text-[#1A1A1A] text-2xl font-bold">{request.title}</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Details */}
          <div className="bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-3">Details</p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] w-24 shrink-0">Property</span>
                <Link
                  href={`/dashboard/properties/${request.property.id}`}
                  className="text-[#16a34a] hover:text-[#15803d] transition-colors truncate"
                >
                  {propertyLabel}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] w-24 shrink-0">Tenant</span>
                <span className="text-[#1A1A1A]">{request.tenant.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] w-24 shrink-0">Submitted</span>
                <span className="text-[#374151]">{fmtDT(request.createdAt)}</span>
              </div>
              {request.inProgressAt && (
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] w-24 shrink-0">In progress</span>
                  <span className="text-[#374151]">{fmtDT(request.inProgressAt)}</span>
                </div>
              )}
              {request.resolvedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] w-24 shrink-0">Resolved</span>
                  <span className="text-[#16a34a]">{fmtDT(request.resolvedAt)}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-2">Description</p>
            <p className="text-[#374151] text-sm leading-relaxed whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-4">Timeline</p>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[9px] top-3 bottom-3 w-px bg-gray-200" />

              <div className="space-y-4">
                {request.statusHistory.map((h) => (
                  <div key={h.id} className="flex gap-3">
                    <div className={`w-[18px] h-[18px] rounded-full shrink-0 mt-0.5 border-2 border-[#F7F8F6] ${STATUS_DOT[h.toStatus]}`} />
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[#1A1A1A] text-sm font-medium">{statusLabel[h.toStatus]}</span>
                        <span className="text-[#9CA3AF] text-xs">—</span>
                        <span className="text-[#6B7280] text-xs">{fmtDT(h.changedAt)}</span>
                      </div>
                      {h.note && (
                        <p className="text-[#6B7280] text-xs mt-1 pl-0 italic">
                          &ldquo;{h.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tenant photos */}
          {tenantPhotos.length > 0 && (
            <div className="bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">
                  Photos from tenant
                  <span className="ml-1.5 text-[#D1D5DB]">({tenantPhotos.length})</span>
                </p>
              </div>
              <PhotoGrid photos={tenantPhotos} />
            </div>
          )}

          {/* Landlord proof photos — only show if photos already exist */}
          {landlordPhotos.length > 0 && (
            <div className="bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4">
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-3">
                Resolution proof
                <span className="ml-1.5 text-[#D1D5DB]">({landlordPhotos.length})</span>
              </p>
              <PhotoGrid photos={landlordPhotos} onDelete={deletePhoto} />
            </div>
          )}
        </div>

        {/* ── Right column: actions ────────────────────────────────────────── */}
        <div className="lg:w-56 shrink-0">
          <div className="bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4 sticky top-20">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-3">Actions</p>

            {request.status === 'RESOLVED' ? (
              <div className="space-y-3">
                {request.resolvedAt && (
                  <p className="text-[#16a34a] text-xs">
                    Resolved {fmtDate(request.resolvedAt)}
                  </p>
                )}
                <button
                  onClick={() => patchStatus('OPEN')}
                  disabled={patching}
                  className="w-full text-sm border border-gray-200 text-[#6B7280] hover:text-[#1A1A1A] hover:border-gray-300 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
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
                    className="w-full text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {patching ? 'Updating…' : 'Mark in progress'}
                  </button>
                )}
                <button
                  onClick={() => setShowResolveModal(true)}
                  disabled={patching}
                  className="w-full text-sm bg-[#16a34a] hover:bg-[#15803d] text-white font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Mark as resolved
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showResolveModal && (
        <ResolveModal
          requestId={request.id}
          onConfirm={handleResolveConfirm}
          onClose={() => setShowResolveModal(false)}
        />
      )}
    </div>
  )
}
