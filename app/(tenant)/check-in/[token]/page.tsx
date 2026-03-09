'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { compressImage } from '@/lib/image-utils'

interface Photo {
  id: string
  roomId: string | null
  roomName: string
  uploadedBy: string
  uploaderName: string
  signedUrl: string | null
  caption: string | null
  condition: string | null
}

interface Report {
  id: string
  status: string
  token: string
  landlordName: string
  tenantConfirmedAt: string | null
  landlordConfirmedAt: string | null
  createdAt: string
  property: {
    line1: string
    line2: string | null
    city: string
    postcode: string
    name: string | null
  }
  tenant: { id: string; name: string; email: string } | null
  photos: Photo[]
}

const CONDITIONS = [
  { value: 'GOOD', label: 'Good', cls: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'MINOR_ISSUE', label: 'Minor issue', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'DAMAGE', label: 'Damage', cls: 'bg-red-100 text-red-700 border-red-200' },
]

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

interface StagedFile {
  roomKey: string
  roomId: string | null
  roomName: string
  file: File
  preview: string
}

export default function TenantCheckInReview() {
  const { token } = useParams<{ token: string }>()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Staged photo upload state
  const [staged, setStaged] = useState<StagedFile | null>(null)
  const [stagedCondition, setStagedCondition] = useState<string | null>(null)
  const [stagedComment, setStagedComment] = useState('')

  // Dispute form state
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/check-in/token/${token}`)
      const json = await res.json()
      if (json.error) setError(json.error)
      else {
        setReport(json.data)
        if (json.data.tenantConfirmedAt) setConfirmed(true)
      }
    } catch {
      setError('Failed to load report')
    }
    setLoading(false)
  }, [token])

  useEffect(() => { fetchReport() }, [fetchReport])

  function stageFile(file: File, roomId: string | null, roomName: string) {
    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE) return
    const preview = URL.createObjectURL(file)
    setStaged({ roomKey: roomId ?? roomName, roomId, roomName, file, preview })
    setStagedCondition(null)
    setStagedComment('')
  }

  function cancelStaged() {
    if (staged) URL.revokeObjectURL(staged.preview)
    setStaged(null)
    setStagedCondition(null)
    setStagedComment('')
  }

  async function uploadStaged() {
    if (!staged || !stagedCondition) return
    setUploading(true)
    try {
      const file = await compressImage(staged.file)
      const formData = new FormData()
      formData.append('file', file)
      if (staged.roomId) formData.append('roomId', staged.roomId)
      formData.append('roomName', staged.roomName)
      formData.append('condition', stagedCondition)
      if (stagedComment.trim()) formData.append('caption', stagedComment.trim())

      await fetch(`/api/check-in/token/${token}/photos`, {
        method: 'POST',
        body: formData,
      })
      cancelStaged()
      await fetchReport()
    } catch { /* silent */ }
    setUploading(false)
  }

  async function handleConfirm() {
    setConfirming(true)
    try {
      const res = await fetch(`/api/check-in/token/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setConfirmed(true)
      }
      await fetchReport()
    } catch { /* silent */ }
    setConfirming(false)
  }

  async function handleDispute() {
    setConfirming(true)
    try {
      const res = await fetch(`/api/check-in/token/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispute', note: disputeReason.trim() || undefined }),
      })
      if (res.ok) {
        setShowDisputeForm(false)
        setDisputeReason('')
      }
      await fetchReport()
    } catch { /* silent */ }
    setConfirming(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8F6]">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8F6]">
        <div className="text-center">
          <p className="text-[#6B7280] text-lg">{error ?? 'Report not found'}</p>
        </div>
      </div>
    )
  }

  const address = [report.property.line1, report.property.line2, report.property.city, report.property.postcode].filter(Boolean).join(', ')
  const isAgreed = report.status === 'AGREED'
  const isDisputed = report.status === 'DISPUTED'

  // Group photos by room
  const roomGroups = new Map<string, { roomId: string | null; roomName: string; photos: Photo[] }>()
  for (const photo of report.photos) {
    const key = photo.roomId ?? photo.roomName
    if (!roomGroups.has(key)) {
      roomGroups.set(key, { roomId: photo.roomId, roomName: photo.roomName, photos: [] })
    }
    roomGroups.get(key)!.photos.push(photo)
  }

  return (
    <div className="min-h-screen bg-[#F7F8F6]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-[#2D6A4F] font-bold text-lg">LetSorted</span>
          </div>
          <h1 className="text-[#1A1A1A] text-2xl font-bold mb-2">Check-in Report</h1>
          <p className="text-[#6B7280]">{address}</p>
          <p className="text-[#9CA3AF] text-sm mt-1">
            Prepared by {report.landlordName} on {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Status banner */}
        {isAgreed && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-green-700 font-medium">This report has been agreed by both parties</p>
          </div>
        )}

        {isDisputed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-red-700 font-medium">You have raised concerns about this report</p>
            <p className="text-red-600 text-sm mt-1">Your landlord will review your feedback</p>
          </div>
        )}

        {confirmed && !isAgreed && !isDisputed && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-blue-700 font-medium">You have confirmed this report</p>
            <p className="text-blue-600 text-sm mt-1">Waiting for your landlord to confirm</p>
          </div>
        )}

        {/* Photos by room */}
        {Array.from(roomGroups.values()).map((group) => {
          const roomKey = group.roomId ?? group.roomName
          const isStagedForThisRoom = staged?.roomKey === roomKey

          return (
            <div key={roomKey} className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
              <h2 className="text-[#1A1A1A] font-semibold mb-3">{group.roomName}</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {group.photos.map((photo) => (
                  <div key={photo.id}>
                    <div className="relative">
                      {photo.signedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.signedUrl}
                          alt={photo.caption ?? photo.roomName}
                          className="w-full h-28 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-28 bg-gray-100 rounded-lg" />
                      )}
                      <div className="absolute top-1.5 left-1.5 flex gap-1">
                        {CONDITIONS.map((c) =>
                          photo.condition === c.value ? (
                            <span key={c.value} className={`text-[10px] px-1.5 py-0.5 rounded border ${c.cls}`}>{c.label}</span>
                          ) : null,
                        )}
                      </div>
                      <div className="absolute top-1.5 right-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          photo.uploadedBy === 'LANDLORD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {photo.uploadedBy === 'LANDLORD' ? 'Landlord' : 'Tenant'}
                        </span>
                      </div>
                    </div>
                    {photo.caption && (
                      <p className="text-xs text-[#6B7280] mt-1">{photo.caption}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Tenant upload area */}
              {!isAgreed && !confirmed && !isDisputed && (
                <>
                  {isStagedForThisRoom ? (
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                      {/* Preview */}
                      <div className="flex items-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={staged.preview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#374151] font-medium truncate">{staged.file.name}</p>
                          <p className="text-xs text-[#9CA3AF]">{(staged.file.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>

                      {/* Condition selector */}
                      <div>
                        <p className="text-sm text-[#374151] font-medium mb-2">Condition <span className="text-red-500">*</span></p>
                        <div className="flex flex-wrap gap-2">
                          {CONDITIONS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setStagedCondition(c.value)}
                              className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                                stagedCondition === c.value
                                  ? c.cls + ' font-medium'
                                  : 'border-gray-200 text-[#6B7280] hover:border-gray-300'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment field */}
                      <div>
                        <p className="text-sm text-[#374151] font-medium mb-1.5">Comment <span className="text-[#9CA3AF] font-normal">(optional)</span></p>
                        <input
                          type="text"
                          value={stagedComment}
                          onChange={(e) => setStagedComment(e.target.value.slice(0, 500))}
                          placeholder="Describe what you can see in this photo..."
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                          maxLength={500}
                        />
                        <p className="text-[10px] text-[#9CA3AF] mt-1 text-right">{stagedComment.length}/500</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={uploadStaged}
                          disabled={!stagedCondition || uploading}
                          className="flex-1 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg py-2 transition-colors"
                        >
                          {uploading ? 'Uploading…' : 'Upload photo'}
                        </button>
                        <button
                          onClick={cancelStaged}
                          disabled={uploading}
                          className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#374151] border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="block border border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-[#16a34a]/40 transition-colors">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) stageFile(file, group.roomId, group.roomName)
                          e.target.value = ''
                        }}
                      />
                      <span className="text-sm text-[#6B7280]">+ Add your photos</span>
                    </label>
                  )}
                </>
              )}
            </div>
          )
        })}

        {report.photos.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-8 mb-4 text-center">
            <p className="text-[#9CA3AF]">No photos in this report yet</p>
          </div>
        )}

        {/* Actions */}
        {!isAgreed && !isDisputed && !confirmed && (
          <div className="mt-8 space-y-3">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {confirming && !showDisputeForm ? 'Confirming…' : 'I confirm this report is accurate'}
            </button>

            {!showDisputeForm ? (
              <button
                onClick={() => setShowDisputeForm(true)}
                disabled={confirming}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-[#374151] font-medium rounded-xl py-3 text-sm transition-colors"
              >
                I have concerns about this report
              </button>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm text-[#374151] font-medium">What are your concerns?</p>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Please describe your concerns..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#374151] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDispute}
                    disabled={confirming}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2 transition-colors"
                  >
                    {confirming ? 'Submitting…' : 'Submit concerns'}
                  </button>
                  <button
                    onClick={() => { setShowDisputeForm(false); setDisputeReason('') }}
                    disabled={confirming}
                    className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#374151] border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
