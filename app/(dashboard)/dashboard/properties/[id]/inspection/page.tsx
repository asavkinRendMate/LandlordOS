'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/image-utils'
import { ROOM_TYPE_LABELS } from '@/lib/room-utils'

interface Room {
  id: string
  type: string
  name: string
  order: number
}

interface Photo {
  id: string
  roomId: string | null
  roomName: string
  uploadedBy: string
  uploaderName: string
  fileUrl: string
  signedUrl: string | null
  caption: string | null
  condition: string | null
  createdAt: string
}

interface Report {
  id: string
  status: string
  token: string
  landlordConfirmedAt: string | null
  tenantConfirmedAt: string | null
  pdfUrl: string | null
  property: {
    id: string
    line1: string
    line2: string | null
    city: string
    postcode: string
    name: string | null
  }
  tenant: { id: string; name: string; email: string } | null
  photos: Photo[]
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024
const CONDITIONS = [
  { value: 'GOOD', label: 'Good', cls: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'MINOR_ISSUE', label: 'Minor issue', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'DAMAGE', label: 'Damage', cls: 'bg-red-100 text-red-700 border-red-200' },
]

export default function InspectionPage() {
  const { id: propertyId } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const reportId = searchParams.get('reportId')
  const router = useRouter()

  const [report, setReport] = useState<Report | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [tenants, setTenants] = useState<{ id: string; name: string; email: string; status: string }[]>([])

  const fetchReport = useCallback(async () => {
    if (!reportId) return
    try {
      const res = await fetch(`/api/inspections/${reportId}`)
      const json = await res.json()
      if (json.data) setReport(json.data)
    } catch { /* silent */ }
    setLoading(false)
  }, [reportId])

  useEffect(() => {
    fetchReport()
    fetch(`/api/properties/${propertyId}/rooms`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setRooms(json.data)
          if (json.data.length > 0) setSelectedRoom(json.data[0])
        }
      })
      .catch(() => {})
    // Fetch tenants for linking
    fetch(`/api/properties/${propertyId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.tenants) {
          setTenants(json.data.tenants.filter((t: { status: string }) => t.status === 'TENANT' || t.status === 'INVITED'))
        }
      })
      .catch(() => {})
  }, [fetchReport, propertyId])

  async function handleUpload(files: FileList) {
    if (!reportId || !selectedRoom) return
    setUploading(true)
    for (const rawFile of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(rawFile.type)) continue
      if (rawFile.size > MAX_SIZE) continue

      const file = await compressImage(rawFile)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('roomId', selectedRoom.id)
      formData.append('roomName', selectedRoom.name)
      formData.append('condition', 'GOOD')

      await fetch(`/api/inspections/${reportId}/photos`, {
        method: 'POST',
        body: formData,
      })
    }
    await fetchReport()
    setUploading(false)
  }

  async function updatePhotoMeta(photoId: string, field: 'caption' | 'condition', value: string) {
    if (!report) return
    // Optimistically update local state
    setReport((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        photos: prev.photos.map((p) =>
          p.id === photoId ? { ...p, [field]: value } : p,
        ),
      }
    })
    // No separate patch endpoint; metadata is set on upload.
    // For caption/condition updates after upload, we'd need a PATCH endpoint.
    // For now, this is local-only until re-fetch.
  }

  async function deletePhoto(photoId: string) {
    if (!reportId) return
    await fetch(`/api/inspections/${reportId}/photos/${photoId}`, { method: 'DELETE' })
    await fetchReport()
  }

  async function sendToTenant() {
    if (!reportId || !report) return
    setSending(true)

    // If no tenant linked, try linking the first available tenant
    if (!report.tenant && tenants.length > 0) {
      await fetch(`/api/inspections/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenants[0].id }),
      })
    }

    await fetch(`/api/inspections/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PENDING' }),
    })
    await fetchReport()
    setSending(false)
  }

  async function confirmReport() {
    if (!reportId) return
    setSending(true)
    await fetch(`/api/inspections/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'AGREED' }),
    })
    await fetchReport()
    setSending(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#6B7280]">Report not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#16a34a] hover:text-[#15803d]">← Back</button>
      </div>
    )
  }

  const address = [report.property.line1, report.property.line2, report.property.city, report.property.postcode].filter(Boolean).join(', ')
  const roomPhotos = selectedRoom
    ? report.photos.filter((p) => p.roomId === selectedRoom.id)
    : []
  const photosPerRoom = rooms.map((room) => ({
    room,
    count: report.photos.filter((p) => p.roomId === room.id).length,
  }))
  const totalPhotos = report.photos.length
  const roomsWithPhotos = photosPerRoom.filter((r) => r.count > 0).length
  const isAgreed = report.status === 'AGREED'
  const tenantConfirmed = !!report.tenantConfirmedAt
  const landlordConfirmed = !!report.landlordConfirmedAt

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      <Link href={`/dashboard/properties/${propertyId}`} className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to property
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[#1A1A1A] text-2xl font-bold">Property Inspection</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{address}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isAgreed ? 'bg-green-100 text-green-700' :
          report.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' :
          report.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {isAgreed ? 'Agreed' : report.status === 'DRAFT' ? 'Draft' : report.status === 'PENDING' ? 'Sent to tenant' : report.status}
        </div>
      </div>

      {/* Progress bar */}
      {rooms.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6B7280]">{roomsWithPhotos} of {rooms.length} rooms have photos</span>
            <span className="text-sm text-[#9CA3AF]">{totalPhotos} photos total</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#16a34a] rounded-full transition-all"
              style={{ width: `${rooms.length > 0 ? (roomsWithPhotos / rooms.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* Room list */}
        <div className="space-y-1">
          {rooms.map((room) => {
            const count = report.photos.filter((p) => p.roomId === room.id).length
            const isSelected = selectedRoom?.id === room.id
            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isSelected
                    ? 'bg-[#16a34a]/10 text-[#16a34a] font-medium'
                    : 'text-[#374151] hover:bg-gray-50'
                }`}
              >
                <span>{room.name}</span>
                {count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-[#16a34a]/20 text-[#16a34a]' : 'bg-gray-100 text-[#9CA3AF]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
          {rooms.length === 0 && (
            <p className="text-sm text-[#9CA3AF] px-3 py-2">
              No rooms configured.{' '}
              <Link href={`/dashboard/properties/${propertyId}`} className="text-[#16a34a] hover:text-[#15803d]">
                Add rooms first
              </Link>
            </p>
          )}
        </div>

        {/* Room detail */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          {selectedRoom ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#1A1A1A] font-semibold">{selectedRoom.name}</h2>
                <span className="text-xs text-[#9CA3AF]">{ROOM_TYPE_LABELS[selectedRoom.type] ?? selectedRoom.type}</span>
              </div>

              {/* Photo grid */}
              {roomPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {roomPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      {photo.signedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.signedUrl}
                          alt={photo.caption ?? photo.roomName}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-[#9CA3AF]">Loading…</span>
                        </div>
                      )}

                      {/* Condition badge */}
                      <div className="absolute top-2 left-2">
                        {CONDITIONS.map((c) =>
                          photo.condition === c.value ? (
                            <span key={c.value} className={`text-[10px] px-1.5 py-0.5 rounded border ${c.cls}`}>{c.label}</span>
                          ) : null,
                        )}
                      </div>

                      {/* Uploader label */}
                      <div className="absolute top-2 right-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          photo.uploadedBy === 'LANDLORD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {photo.uploadedBy === 'LANDLORD' ? 'Landlord' : 'Tenant'}
                        </span>
                      </div>

                      {/* Delete button */}
                      {!isAgreed && photo.uploadedBy === 'LANDLORD' && (
                        <button
                          onClick={() => deletePhoto(photo.id)}
                          className="absolute bottom-2 right-2 w-6 h-6 bg-white/90 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}

                      {/* Caption */}
                      {photo.caption && (
                        <p className="text-xs text-[#6B7280] mt-1 truncate">{photo.caption}</p>
                      )}

                      {/* Inline condition selector for landlord photos */}
                      {!isAgreed && photo.uploadedBy === 'LANDLORD' && (
                        <div className="flex gap-1 mt-1">
                          {CONDITIONS.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => updatePhotoMeta(photo.id, 'condition', c.value)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                                photo.condition === c.value ? c.cls : 'border-gray-200 text-[#9CA3AF] hover:border-gray-300'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              {!isAgreed && (
                <label className="block border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-[#16a34a]/40 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleUpload(e.target.files)}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#6B7280]">Uploading…</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-[#6B7280]">Click or drag photos here</p>
                      <p className="text-xs text-[#9CA3AF] mt-1">JPEG, PNG or WebP (max 10MB each)</p>
                    </>
                  )}
                </label>
              )}
            </>
          ) : (
            <p className="text-sm text-[#9CA3AF] text-center py-8">Select a room to add photos</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isAgreed && (
        <div className="mt-6 flex flex-wrap gap-3">
          {report.status === 'DRAFT' && (
            <>
              {(report.tenant || tenants.length > 0) && totalPhotos > 0 && (
                <button onClick={sendToTenant} disabled={sending}
                  className="px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {sending ? 'Sending…' : 'Send to tenant'}
                </button>
              )}
              <span className="text-xs text-[#9CA3AF] self-center">Draft saved automatically</span>
            </>
          )}

          {(report.status === 'IN_REVIEW' || (report.status === 'PENDING' && tenantConfirmed)) && (
            <button onClick={confirmReport} disabled={sending}
              className="px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
              {sending ? 'Confirming…' : 'Confirm final report'}
            </button>
          )}

          {report.status === 'PENDING' && !tenantConfirmed && (
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              Waiting for tenant to review
            </div>
          )}

          {tenantConfirmed && !landlordConfirmed && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Tenant has confirmed — ready for your confirmation
            </div>
          )}
        </div>
      )}

      {isAgreed && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-green-700">Report agreed by both parties</span>
            </div>
            {report.pdfUrl ? (
              <a
                href={`/api/inspections/${report.id}/pdf-url`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 hover:text-green-800 font-medium"
              >
                Download report &rarr;
              </a>
            ) : (
              <button
                onClick={async () => {
                  await fetch(`/api/inspections/${report.id}/generate-pdf`, { method: 'POST' }).catch(() => {})
                  await fetchReport()
                }}
                className="text-sm text-gray-400 hover:text-gray-500"
              >
                PDF generating… retry?
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
