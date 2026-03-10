'use client'

import { useState } from 'react'

interface DeletePropertyModalProps {
  propertyId: string
  propertyAddress: string
  onClose: () => void
  onDeleted: () => void
}

export default function DeletePropertyModal({
  propertyId,
  propertyAddress,
  onClose,
  onDeleted,
}: DeletePropertyModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = confirmText.trim().toLowerCase() === propertyAddress.trim().toLowerCase()

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(json?.error ?? 'Failed to delete property')
        setDeleting(false)
        return
      }
      onDeleted()
    } catch {
      setError('Network error — please try again')
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[#1A1A1A] font-semibold">{propertyAddress}</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Warning block */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-500 shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-2">This will permanently delete:</p>
                <ul className="space-y-1 text-amber-700 text-xs">
                  <li>All screening reports and applicant data</li>
                  <li>All tenant records and documents</li>
                  <li>All maintenance requests</li>
                  <li>All rent payment records</li>
                  <li>All check-in reports and photos</li>
                  <li>All compliance documents</li>
                </ul>
                <p className="font-medium mt-2 text-amber-900">This action cannot be undone.</p>
              </div>
            </div>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="block text-sm text-[#6B7280] mb-1.5">
              Type the property address to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={propertyAddress}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[#1A1A1A] text-sm placeholder-gray-300 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 transition-colors"
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
          <button
            onClick={handleDelete}
            disabled={!matches || deleting}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete property'}
          </button>
          <button
            onClick={onClose}
            className="w-full text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors text-center py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
