'use client'

import { useState, useRef } from 'react'

export interface DocType {
  value: string
  label: string
}

interface PendingFile {
  file: File
  documentType: string
  expiryDate: string
  progress: 'idle' | 'uploading' | 'done' | 'error'
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onUploaded: () => void
  uploadEndpoint: string
  extraFields: Record<string, string>
  documentTypes: DocType[]
  expiryDateTypes?: string[]   // types that require an expiry date field
  preselectedType?: string     // auto-select this type for dropped files
  title?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') {
    return (
      <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
  if (mimeType.startsWith('image/')) {
    return (
      <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5 text-[#9CA3AF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

export default function DocumentUploadModal({
  isOpen,
  onClose,
  onUploaded,
  uploadEndpoint,
  extraFields,
  documentTypes,
  expiryDateTypes = [],
  preselectedType,
  title = 'Upload Documents',
}: Props) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const expirySet = new Set(expiryDateTypes)

  if (!isOpen) return null

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    setPendingFiles((prev) => [
      ...prev,
      ...arr.map((f) => ({
        file: f,
        documentType: preselectedType ?? '',
        expiryDate: '',
        progress: 'idle' as const,
      })),
    ])
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateFile(idx: number, patch: Partial<PendingFile>) {
    setPendingFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }

  async function uploadAll() {
    const invalid = pendingFiles.some((f) => !f.documentType)
    if (invalid) { alert('Please select a document type for each file.'); return }

    setUploading(true)
    let anyFailed = false

    for (let i = 0; i < pendingFiles.length; i++) {
      const pf = pendingFiles[i]
      if (pf.progress === 'done') continue
      updateFile(i, { progress: 'uploading' })

      const fd = new FormData()
      fd.append('file', pf.file)
      for (const [k, v] of Object.entries(extraFields)) fd.append(k, v)
      fd.append('documentType', pf.documentType)
      if (pf.expiryDate) fd.append('expiryDate', pf.expiryDate)

      const res = await fetch(uploadEndpoint, { method: 'POST', body: fd })
      updateFile(i, { progress: res.ok ? 'done' : 'error' })
      if (!res.ok) anyFailed = true
    }

    setUploading(false)
    if (!anyFailed) {
      onUploaded()
      onClose()
      setPendingFiles([])
    }
  }

  function handleClose() {
    setPendingFiles([])
    onClose()
  }

  const doneCount    = pendingFiles.filter((f) => f.progress === 'done').length
  const pendingCount = pendingFiles.filter((f) => f.progress !== 'done').length
  const showExpiry   = (type: string) => expirySet.has(type)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[#1A1A1A] font-semibold">{title}</h2>
          <button onClick={handleClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-[#16a34a] bg-green-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-[#6B7280] text-sm">Drop files here or <span className="text-[#16a34a] font-medium">click to browse</span></p>
            <p className="text-[#9CA3AF] text-xs mt-1">PDF, images (JPG, PNG, WEBP), DOCX</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,application/pdf,image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {pendingFiles.length > 0 && (
            <div className="space-y-3">
              {pendingFiles.map((pf, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FileIcon mimeType={pf.file.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[#1A1A1A] text-sm font-medium truncate">{pf.file.name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {pf.progress === 'uploading' && (
                            <div className="w-4 h-4 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
                          )}
                          {pf.progress === 'done'  && <span className="text-[#16a34a] text-xs font-medium">Done</span>}
                          {pf.progress === 'error' && <span className="text-red-500 text-xs font-medium">Failed</span>}
                          {pf.progress === 'idle'  && (
                            <button onClick={() => removeFile(i)} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[#9CA3AF] text-xs mt-0.5">{formatBytes(pf.file.size)}</p>

                      {pf.progress === 'idle' && (
                        <div className="mt-3 space-y-2">
                          <select
                            value={pf.documentType}
                            onChange={(e) => updateFile(i, { documentType: e.target.value })}
                            className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors"
                          >
                            <option value="">Select document type…</option>
                            {documentTypes.map(({ value, label }) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          {showExpiry(pf.documentType) && (
                            <div>
                              <label className="text-xs text-[#6B7280] mb-1 block">Expiry date</label>
                              <input
                                type="date"
                                value={pf.expiryDate}
                                onChange={(e) => updateFile(i, { expiryDate: e.target.value })}
                                className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {pendingFiles.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={uploadAll}
              disabled={uploading || pendingCount === 0}
              className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              {uploading
                ? `Uploading… (${doneCount}/${pendingFiles.length})`
                : `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
