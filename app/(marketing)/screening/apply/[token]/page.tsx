'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ScoringProgressScreen from '@/components/shared/ScoringProgressScreen'
interface StatementFile {
  index: number
  fileName: string
  storagePath: string
  fileSize: number
  verificationStatus: 'PENDING' | 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN'
  detectedName?: string | null
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  reason?: string
  relationship?: string | null
  removedByApplicant?: boolean
}

interface ScoringResult {
  status: string
  totalScore: number | null
  grade: string | null
  verificationToken: string
  hasUnverifiedFiles?: boolean
  statementFiles?: StatementFile[]
  applicantName?: string | null
  failureReason?: string | null
}

type PollData = ScoringResult

// ── Types ───────────────────────────────────────────────────────────────────────

interface InviteData {
  id: string
  candidateName: string
  candidateEmail: string
  propertyAddress: string
  monthlyRentPence: number
  status: string
  report: {
    id: string
    status: string
    totalScore: number | null
    grade: string | null
    verificationToken: string
  } | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

const MAX_FILES = 5
const MAX_TOTAL_SIZE = 10 * 1024 * 1024

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors'

// ── Page ────────────────────────────────────────────────────────────────────────

export default function CandidateApplyPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Step: confirm | upload | processing | declarations | done | failed
  const [step, setStep] = useState<'confirm' | 'upload' | 'processing' | 'declarations' | 'done' | 'failed'>('confirm')

  // Form
  const [declaredIncome, setDeclaredIncome] = useState('')
  const [isJointApplication, setIsJointApplication] = useState(false)
  const [incomeHintOpen, setIncomeHintOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)

  // Result
  const [scoring, setScoring] = useState<ScoringResult | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  // Declarations state
  const [declarations, setDeclarations] = useState<Record<number, { relationship: string; custom: string }>>({})

  // ── Fetch invite ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/screening/invite/${token}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setFetchError(json.error)
        } else {
          setInvite(json.data)
          // If already completed, skip to done
          if (json.data.status === 'COMPLETED' || json.data.status === 'PAID') {
            if (json.data.report?.status === 'COMPLETED') {
              setStep('done')
            }
          }
        }
      })
      .catch(() => setFetchError('Could not load invite'))
      .finally(() => setLoading(false))
  }, [token])

  // ── File handling ───────────────────────────────────────────────────────────────

  function addFiles(incoming: File[]) {
    setFileError(null)
    const pdfs = incoming.filter((f) => f.type === 'application/pdf')
    if (pdfs.length !== incoming.length) setFileError('Only PDF files are accepted')
    const combined = [...files, ...pdfs]
    if (combined.length > MAX_FILES) { setFileError(`Maximum ${MAX_FILES} files allowed`); return }
    const totalSize = combined.reduce((s, f) => s + f.size, 0)
    if (totalSize > MAX_TOTAL_SIZE) { setFileError('Total file size exceeds 10 MB'); return }
    setFiles(combined)
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setFileError(null)
  }

  // ── Proceed to upload step ──────────────────────────────────────────────────────

  function handleConfirm() {
    // Mark as started
    fetch(`/api/screening/invite/${token}/started`, { method: 'POST' }).catch(() => {})
    setStep('upload')
  }

  // ── Submit ──────────────────────────────────────────────────────────────────────

  const pollForResult = useCallback(async (_rid: string) => {
    const pollInterval = setInterval(async () => {
      try {
        // Poll public invite endpoint (no auth required — candidate isn't logged in)
        const res = await fetch(`/api/screening/invite/${token}`)
        if (!res.ok) return // keep polling
        const json = await res.json()
        const report = json.data?.report as PollData | undefined
        if (report?.status === 'COMPLETED') {
          clearInterval(pollInterval)
          setScoring(report)
          if (report.hasUnverifiedFiles && report.statementFiles?.some(
            (f: StatementFile) => !f.removedByApplicant && f.verificationStatus === 'UNVERIFIED',
          )) {
            setStep('declarations')
          } else {
            setStep('done')
          }
        } else if (report?.status === 'FAILED') {
          clearInterval(pollInterval)
          setScoring(report)
          setStep('failed')
        }
      } catch {
        // Keep polling
      }
    }, 3000)

    // Timeout after 3 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
    }, 180000)
  }, [token])

  async function handleSubmit() {
    if (submitting || files.length === 0) return
    setSubmitting(true)

    try {
      const formData = new FormData()
      if (declaredIncome) formData.append('declaredIncome', declaredIncome)
      if (isJointApplication) formData.append('isJointApplication', 'true')
      for (const f of files) {
        formData.append('file', f)
      }

      const res = await fetch(`/api/screening/invite/${token}/submit`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()

      if (!res.ok) {
        setFileError(json.error || 'Upload failed')
        setSubmitting(false)
        return
      }

      setStep('processing')
      setReportId(json.data.reportId)
      pollForResult(json.data.reportId)
    } catch {
      setFileError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Error / Expired ─────────────────────────────────────────────────────────────

  if (fetchError || !invite) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {fetchError === 'Invite not found' ? 'Invite not found' : 'Something went wrong'}
          </h1>
          <p className="text-gray-500 text-sm">
            {fetchError === 'Invite not found'
              ? 'This link may be invalid or have expired.'
              : fetchError || 'Please try again later.'}
          </p>
        </div>
      </div>
    )
  }

  if (invite.status === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invite expired</h1>
          <p className="text-gray-500 text-sm">
            This screening invite has expired. Please ask your landlord to send a new one.
          </p>
        </div>
      </div>
    )
  }

  // ── Declarations ────────────────────────────────────────────────────────────────

  async function onDeclarationsSubmit() {
    if (!reportId || !scoring?.statementFiles) return

    const unverifiedFiles = (scoring.statementFiles as StatementFile[]).filter(
      (f) => !f.removedByApplicant && f.verificationStatus === 'UNVERIFIED',
    )

    const declPayload = unverifiedFiles.map((f) => {
      const decl = declarations[f.index]
      if (!decl || !decl.relationship) {
        return { index: f.index, relationship: 'REMOVE' }
      }
      return {
        index: f.index,
        relationship: decl.relationship,
        customRelationship: decl.relationship === 'OTHER' ? decl.custom : undefined,
      }
    })

    const hasRemovals = declPayload.some((d) => d.relationship === 'REMOVE')

    const res = await fetch(`/api/scoring/${reportId}/declarations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ declarations: declPayload }),
    })

    if (res.ok) {
      const json = await res.json()
      if (json.data?.reanalyzing || hasRemovals) {
        setStep('processing')
        pollForResult(reportId)
      } else {
        setStep('done')
      }
    }
  }

  if (step === 'declarations' && scoring?.statementFiles) {
    const unverifiedFiles = (scoring.statementFiles as StatementFile[]).filter(
      (f) => !f.removedByApplicant && f.verificationStatus === 'UNVERIFIED',
    )

    const RELATIONSHIP_OPTIONS = [
      { value: 'PARTNER', label: 'My partner' },
      { value: 'SPOUSE', label: 'My spouse' },
      { value: 'GUARANTOR', label: 'My guarantor' },
      { value: 'PARENT', label: 'My parent' },
      { value: 'OTHER', label: 'Other' },
    ]

    const allDeclared = unverifiedFiles.every((f) => {
      const decl = declarations[f.index]
      return decl && decl.relationship && (decl.relationship !== 'OTHER' || decl.custom)
    })

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center">
            <Link href="/">
              <Image src="/logo.svg" alt="LetSorted" width={150} height={50} priority />
            </Link>
          </div>
        </nav>

        <div className="flex-1">
          <div className="max-w-lg mx-auto py-10 px-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-gray-900 font-bold text-lg">We couldn&apos;t verify ownership of some statements</h1>
                  <p className="text-gray-500 text-sm mt-0.5">Please tell us who these statements belong to.</p>
                </div>
              </div>

              <div className="space-y-4">
                {unverifiedFiles.map((file) => (
                  <div key={file.index} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-800 truncate">{file.fileName}</span>
                    </div>
                    <p className="text-xs text-amber-700 mb-3">
                      Name found: <strong>{file.detectedName ?? 'Unknown'}</strong> — couldn&apos;t confirm this belongs to {scoring.applicantName ?? 'you'}
                    </p>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">This statement belongs to:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {RELATIONSHIP_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDeclarations((prev) => ({
                              ...prev,
                              [file.index]: { ...prev[file.index], relationship: opt.value, custom: prev[file.index]?.custom ?? '' },
                            }))}
                            className={`text-xs font-medium rounded-lg px-3 py-2 border transition-colors text-left
                              ${declarations[file.index]?.relationship === opt.value
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {declarations[file.index]?.relationship === 'OTHER' && (
                        <input
                          type="text"
                          placeholder="Describe the relationship..."
                          value={declarations[file.index]?.custom ?? ''}
                          onChange={(e) => setDeclarations((prev) => ({
                            ...prev,
                            [file.index]: { ...prev[file.index], custom: e.target.value },
                          }))}
                          className={inputClass}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setDeclarations((prev) => ({
                          ...prev,
                          [file.index]: { relationship: 'REMOVE', custom: '' },
                        }))}
                        className={`text-xs rounded-lg px-3 py-2 border transition-colors w-full text-left
                          ${declarations[file.index]?.relationship === 'REMOVE'
                            ? 'border-red-300 bg-red-50 text-red-600 font-medium'
                            : 'border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200'}`}
                      >
                        Not mine — remove this file
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={!allDeclared}
                onClick={onDeclarationsSubmit}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors mt-5"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
        <CandidateFooter />
      </div>
    )
  }

  // ── Processing ──────────────────────────────────────────────────────────────────

  if (step === 'processing') {
    return <ScoringProgressScreen fileCount={files.length} isComplete={false} />
  }

  // ── Failed ──────────────────────────────────────────────────────────────────────

  if (step === 'failed') {
    return (
      <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-2">Analysis failed</h1>
          <p className="text-gray-500 text-sm mb-1">
            {scoring?.failureReason || 'We couldn\'t process the bank statements.'}
          </p>
          <p className="text-gray-400 text-xs mb-6">Please try again with different files.</p>
          <button
            onClick={() => {
              setStep('upload')
              setFiles([])
              setFileError(null)
              setSubmitting(false)
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ── Score message helper ────────────────────────────────────────────────────────

  function scoreMessage(score: number) {
    if (score >= 75) return {
      colour: 'text-green-700 bg-green-50 border-green-200',
      numberColour: 'text-green-700',
      message: 'Strong result — your finances look healthy. Your landlord will review your application and be in touch soon.',
    }
    if (score >= 60) return {
      colour: 'text-amber-700 bg-amber-50 border-amber-200',
      numberColour: 'text-amber-700',
      message: 'Good result overall. Your landlord may want to discuss a couple of points with you — this is completely normal and doesn\'t mean your application has been rejected.',
    }
    if (score >= 45) return {
      colour: 'text-amber-700 bg-amber-50 border-amber-200',
      numberColour: 'text-amber-700',
      message: 'Your application has been submitted. Your landlord will review it and may ask for additional information — such as a guarantor or additional references. Don\'t be discouraged — landlords consider many factors beyond score.',
    }
    return {
      colour: 'text-gray-600 bg-gray-50 border-gray-200',
      numberColour: 'text-gray-600',
      message: 'Your application has been submitted. Your score suggests your landlord may want to discuss your finances further, or ask for supporting documents such as a guarantor or employer reference. We recommend reaching out to your landlord directly to explain your situation — context always helps.',
    }
  }

  function CandidateScoreCard({ score, verificationToken }: { score: number; verificationToken: string }) {
    const { colour, numberColour, message } = scoreMessage(score)
    const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const verifyUrl = `${appUrl}/verify/${verificationToken}`

    return (
      <div className="space-y-5">
        <div className={`rounded-2xl border p-6 ${colour}`}>
          <p className="text-xs uppercase tracking-wide font-medium opacity-70 mb-1">Your reliability score</p>
          <p className={`text-4xl font-extrabold ${numberColour}`}>{score} <span className="text-lg font-semibold opacity-60">points</span></p>
          <p className="text-sm leading-relaxed mt-4">{message}</p>
        </div>

        <p className="text-xs text-gray-400 text-center leading-relaxed">
          This score is one of many factors your landlord will consider. It is not a decision — only your landlord can accept or decline your application.
        </p>

        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Verification Link</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={verifyUrl}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={() => navigator.clipboard.writeText(verifyUrl)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-green-600 transition-colors text-xs font-medium"
            >
              Copy
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-2">Share this link to prove your report is genuine.</p>
        </div>
      </div>
    )
  }

  function CandidateFooter() {
    return (
      <footer className="border-t border-[#F0F0F0] py-8 text-center text-xs text-gray-400">
        <p>
          &copy; 2025 LetSorted Ltd &middot;{' '}
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link> &middot;{' '}
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link> &middot;{' '}
          <a href="mailto:hello@letsorted.co.uk" className="hover:text-gray-600 transition-colors">hello@letsorted.co.uk</a>
        </p>
      </footer>
    )
  }

  // ── Done ────────────────────────────────────────────────────────────────────────

  if (step === 'done' && scoring && scoring.totalScore !== null) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center">
            <Link href="/">
              <Image src="/logo.svg" alt="LetSorted" width={150} height={50} priority />
            </Link>
          </div>
        </nav>
        <div className="flex-1">
          <div className="max-w-lg mx-auto py-10 px-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Check complete</h1>
              <p className="text-gray-500 text-sm">Your landlord has been notified.</p>
            </div>
            <CandidateScoreCard score={scoring.totalScore} verificationToken={scoring.verificationToken} />
          </div>
        </div>
        <CandidateFooter />
      </div>
    )
  }

  // ── Done (from invite.report, no polling needed) ────────────────────────────────

  if (step === 'done' && invite.report) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center">
            <Link href="/">
              <Image src="/logo.svg" alt="LetSorted" width={150} height={50} priority />
            </Link>
          </div>
        </nav>
        <div className="flex-1">
          <div className="max-w-lg mx-auto py-10 px-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Already completed</h1>
              <p className="text-gray-500 text-sm">This financial check has already been submitted. Your landlord has been notified.</p>
            </div>
            {invite.report.totalScore !== null && (
              <CandidateScoreCard score={invite.report.totalScore} verificationToken={invite.report.verificationToken} />
            )}
          </div>
        </div>
        <CandidateFooter />
      </div>
    )
  }

  // ── Confirm / Upload steps ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 py-3 md:px-6 md:py-0 md:h-16 flex items-center">
          <Link href="/">
            <Image src="/logo-icon.svg" alt="LetSorted" width={32} height={32} className="md:hidden" priority />
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="hidden md:block" priority />
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto py-10 px-4">
        {/* Property info header */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-800 text-sm font-semibold">{invite.propertyAddress}</p>
          <p className="text-green-600 text-xs mt-1">
            Rent: £{(invite.monthlyRentPence / 100).toLocaleString('en-GB')}/mo
          </p>
        </div>

        {step === 'confirm' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Hi {invite.candidateName}</h1>
              <p className="text-gray-500 text-sm">
                Your landlord has invited you to complete a financial check. Upload your bank statements
                and get your score in under 2 minutes.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">What you&apos;ll need</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  PDF bank statements (last 3–6 months)
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Download from your online banking (takes seconds)
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Up to 5 files, 10 MB total
                </li>
              </ul>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
            >
              Continue
            </button>

            <p className="text-xs text-gray-400 text-center">
              Your data is processed securely and never stored long-term.
            </p>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Upload your bank statements</h2>

            {/* Declared income */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Monthly take-home income (£) <span className="text-gray-400 font-normal">— optional</span>
              </label>
              <input
                type="number"
                value={declaredIncome}
                onChange={(e) => setDeclaredIncome(e.target.value)}
                placeholder={isJointApplication ? 'Combined monthly take-home pay' : 'Your monthly take-home pay'}
                min="0"
                step="1"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter your total monthly income after tax (take-home pay). Include all regular income sources.
              </p>

              {/* Expandable hint */}
              <button
                type="button"
                onClick={() => setIncomeHintOpen(!incomeHintOpen)}
                className="text-xs text-green-600 hover:text-green-700 font-medium mt-1.5 flex items-center gap-1 transition-colors"
              >
                What counts as income?
                <svg className={`w-3 h-3 transition-transform duration-200 ${incomeHintOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${incomeHintOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-3.5 text-xs text-gray-600 space-y-2.5">
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">Include:</p>
                    <ul className="space-y-0.5 list-disc list-inside text-gray-500">
                      <li>Your monthly salary or wages (after tax)</li>
                      <li>Regular freelance or self-employed income</li>
                      <li>Dividends if you&apos;re a company director</li>
                      <li>Universal Credit or Housing Benefit</li>
                      <li>Pension payments</li>
                      <li>Any other regular monthly income</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">If applying jointly with a partner:</p>
                    <p className="text-gray-500">Include your combined household income and upload bank statements for both of you.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">Do not include:</p>
                    <ul className="space-y-0.5 list-disc list-inside text-gray-500">
                      <li>One-off bonuses or irregular payments</li>
                      <li>Annual income — convert to monthly first (annual / 12)</li>
                      <li>Gross/before-tax salary</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Example pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">Employed: take-home pay after tax</span>
                <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">Self-employed: average monthly net profit</span>
                <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">Joint: combined take-home for both applicants</span>
              </div>
            </div>

            {/* Joint application toggle */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsJointApplication(!isJointApplication)}
                className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-700">Joint application (with partner/spouse)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Turn this on if you are applying together and will upload statements for both people</p>
                </div>
                <div className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ml-3 ${isJointApplication ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isJointApplication ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {isJointApplication && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <div className="flex gap-2">
                    <svg className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-teal-800 space-y-1.5">
                      <p className="font-semibold">Joint application</p>
                      <p>Please upload bank statements for both applicants. Make sure the monthly income above reflects your combined take-home pay.</p>
                      <p className="text-teal-600">Example: You earn £2,000/mo and your partner earns £2,500/mo — enter £4,500 as your monthly income.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank statements (PDF)</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  addFiles(Array.from(e.dataTransfer.files))
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(Array.from(e.target.files))
                    e.target.value = ''
                  }}
                />
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-500 text-sm">Drop PDF files here or click to browse</p>
                <p className="text-gray-400 text-xs mt-1">Up to {MAX_FILES} files, 10 MB total</p>
              </div>

              {fileError && <p className="text-red-500 text-xs mt-2">{fileError}</p>}

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-700 truncate">{f.name}</span>
                        <span className="text-xs text-gray-400 shrink-0">{fmtBytes(f.size)}</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400">{files.length} of {MAX_FILES} files selected</p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={files.length === 0 || submitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Uploading...' : 'Submit for analysis'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Analysis takes 1–2 minutes. Your data is encrypted and processed securely.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
