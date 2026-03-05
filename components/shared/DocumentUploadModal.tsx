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
      <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
  if (mimeType.startsWith('image/')) {
    return (
      <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5 text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-[#1a2a1a] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <h2 className="text-white font-semibold">{title}</h2>
          <button onClick={handleClose} className="text-white/40 hover:text-white/70 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-green-400 bg-green-500/10' : 'border-white/15 hover:border-white/25'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-8 h-8 text-white/30 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-white/50 text-sm">Drop files here or <span className="text-green-400">click to browse</span></p>
            <p className="text-white/30 text-xs mt-1">PDF, images (JPG, PNG, WEBP), DOCX</p>
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
                <div key={i} className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FileIcon mimeType={pf.file.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-medium truncate">{pf.file.name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {pf.progress === 'uploading' && (
                            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          {pf.progress === 'done'  && <span className="text-green-400 text-xs">✓</span>}
                          {pf.progress === 'error' && <span className="text-red-400 text-xs">Failed</span>}
                          {pf.progress === 'idle'  && (
                            <button onClick={() => removeFile(i)} className="text-white/30 hover:text-white/60 transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">{formatBytes(pf.file.size)}</p>

                      {pf.progress === 'idle' && (
                        <div className="mt-3 space-y-2">
                          <select
                            value={pf.documentType}
                            onChange={(e) => updateFile(i, { documentType: e.target.value })}
                            className="w-full appearance-none bg-[#1a2e1a] border border-white/12 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors"
                          >
                            <option value="" className="bg-[#1a2e1a] text-white">Select document type…</option>
                            {documentTypes.map(({ value, label }) => (
                              <option key={value} value={value} className="bg-[#1a2e1a] text-white">{label}</option>
                            ))}
                          </select>
                          {showExpiry(pf.documentType) && (
                            <div>
                              <label className="text-xs text-white/40 mb-1 block">Expiry date</label>
                              <input
                                type="date"
                                value={pf.expiryDate}
                                onChange={(e) => updateFile(i, { expiryDate: e.target.value })}
                                className="w-full appearance-none bg-[#1a2e1a] border border-white/12 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
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
          <div className="px-5 py-4 border-t border-white/8 shrink-0">
            <button
              onClick={uploadAll}
              disabled={uploading || pendingCount === 0}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
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
