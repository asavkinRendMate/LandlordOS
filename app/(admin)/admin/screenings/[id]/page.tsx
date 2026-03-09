'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type ScreeningDetail = {
  id: string
  status: string
  totalScore: number | null
  grade: string | null
  aiSummary: string | null
  applicantEmail: string | null
  applicantName: string | null
  propertyAddress: string | null
  breakdown: Record<string, number> | null
  appliedRules: Array<{ key: string; description: string; points: number }> | null
  failureReason: string | null
  createdAt: string
}

type FileEntry = {
  fileName: string
  fileSize: number | null
  storagePath: string
  downloadUrl: string | null
}

type LogEntry = {
  id: string
  stage: string
  level: string
  message: string
  data: Record<string, unknown> | null
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number | null) {
  if (bytes === null) return '\u2014'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminScreeningDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [screening, setScreening] = useState<ScreeningDetail | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filesLoading, setFilesLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/screenings/${id}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const body = await res.json()
      if (body.error) setError(body.error)
      else setScreening(body.data)
    } catch {
      setError('Failed to load screening')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/screenings/${id}/files`)
      const body = await res.json()
      if (body.data) setFiles(body.data)
    } catch {
      // non-critical
    } finally {
      setFilesLoading(false)
    }
  }, [id])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/screenings/${id}/logs`)
      const body = await res.json()
      if (body.data) setLogs(body.data)
    } catch {
      // non-critical
    } finally {
      setLogsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
    fetchFiles()
    fetchLogs()
  }, [fetchDetail, fetchFiles, fetchLogs])

  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !screening) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error ?? 'Screening not found'}</p>
          <Link href="/admin/screenings" className="mt-4 text-sm text-blue-600 hover:text-blue-800 inline-block">
            Back to screenings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">LetSorted Admin</h1>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-gray-500 hover:text-gray-900">Data</Link>
              <Link href="/admin/notifications" className="text-gray-500 hover:text-gray-900">Notifications</Link>
              <Link href="/admin/screenings" className="text-gray-500 hover:text-gray-900">Screenings</Link>
            </nav>
          </div>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-900">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back */}
        <Link href="/admin/screenings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All screenings
        </Link>

        {/* Header info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {screening.applicantName ?? screening.applicantEmail ?? 'Unknown applicant'}
              </h2>
              {screening.applicantName && screening.applicantEmail && (
                <p className="text-sm text-gray-500 mt-0.5">{screening.applicantEmail}</p>
              )}
              {screening.propertyAddress && (
                <p className="text-sm text-gray-500 mt-1">{screening.propertyAddress}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">{formatDateTime(screening.createdAt)}</p>
            </div>
            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[screening.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {screening.status}
            </span>
          </div>

          {/* Score + Grade */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase">Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {screening.totalScore !== null ? `${screening.totalScore}/100` : '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Grade</p>
              <p className="text-2xl font-bold text-gray-900">{screening.grade ?? '\u2014'}</p>
            </div>
          </div>

          {/* Failure reason */}
          {screening.failureReason && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                <span className="font-medium">Failure reason:</span> {screening.failureReason}
              </p>
            </div>
          )}
        </div>

        {/* AI Summary */}
        {screening.aiSummary && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">AI Summary</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{screening.aiSummary}</p>
          </div>
        )}

        {/* Applied Rules */}
        {screening.appliedRules && screening.appliedRules.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Applied Rules ({screening.appliedRules.length})
            </h3>
            <div className="space-y-2">
              {screening.appliedRules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-900">{rule.description}</p>
                    <p className="text-xs text-gray-400 font-mono">{rule.key}</p>
                  </div>
                  <span className={`text-sm font-medium ${rule.points > 0 ? 'text-green-600' : rule.points < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {rule.points > 0 ? '+' : ''}{rule.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
            Bank Statement Files
          </h3>
          {filesLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <p className="text-sm text-gray-500">No files found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">{f.fileName}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(f.fileSize)}</p>
                    </div>
                  </div>
                  {f.downloadUrl ? (
                    <a
                      href={f.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Logs */}
        <ScreeningLogs logs={logs} loading={logsLoading} />
      </div>
    </div>
  )
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: 'text-gray-500',
  WARN: 'text-yellow-600',
  ERROR: 'text-red-600',
}

const STAGE_COLORS: Record<string, string> = {
  INIT: 'bg-gray-100 text-gray-700',
  PDF: 'bg-blue-100 text-blue-700',
  VERIFY: 'bg-purple-100 text-purple-700',
  VALIDATE: 'bg-indigo-100 text-indigo-700',
  ANALYSE: 'bg-cyan-100 text-cyan-700',
  SCORE: 'bg-yellow-100 text-yellow-700',
  SAVE: 'bg-green-100 text-green-700',
  COMPLETE: 'bg-green-100 text-green-800',
  ERROR: 'bg-red-100 text-red-700',
}

function ScreeningLogs({ logs, loading }: { logs: LogEntry[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
        Debug Logs ({logs.length})
      </h3>
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500">No logs found. Logs are only generated for screenings run after this feature was enabled.</p>
      ) : (
        <div className="space-y-1 font-mono text-xs">
          {logs.map((entry) => {
            const hasData = entry.data && Object.keys(entry.data).length > 0
            const isExpanded = expanded.has(entry.id)
            return (
              <div key={entry.id}>
                <div
                  className={`flex items-start gap-2 py-1 px-2 rounded hover:bg-gray-50 ${hasData ? 'cursor-pointer' : ''}`}
                  onClick={() => hasData && toggleExpanded(entry.id)}
                >
                  <span className="text-gray-400 shrink-0 w-[52px]">
                    {new Date(entry.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${STAGE_COLORS[entry.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                    {entry.stage}
                  </span>
                  <span className={`shrink-0 w-10 ${LEVEL_COLORS[entry.level] ?? 'text-gray-500'}`}>
                    {entry.level}
                  </span>
                  <span className="text-gray-800 break-all">{entry.message}</span>
                  {hasData && (
                    <span className="text-gray-400 shrink-0">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                  )}
                </div>
                {isExpanded && hasData && (
                  <pre className="ml-[88px] px-2 py-1.5 bg-gray-50 rounded text-[11px] text-gray-600 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
