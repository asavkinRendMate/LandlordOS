'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import ScoringProgressScreen from '@/components/shared/ScoringProgressScreen'
import { inputClass, selectClass } from '@/lib/form-styles'

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-500">{message}</p>
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PropertyData {
  id: string
  line1: string
  line2: string | null
  city: string
  postcode: string
  name: string | null
  requireFinancialVerification: boolean
}

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
  hasUnverifiedFiles?: boolean
  statementFiles?: StatementFile[]
  applicantName?: string | null
  failureReason?: string | null
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  currentAddress: z.string().min(1, 'Current address is required'),
  employmentStatus: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'STUDENT', 'OTHER'], {
    error: 'Please select your employment status',
  }),
  monthlyIncome: z.string().min(1, 'Monthly income is required'),
  message: z.string().optional(),
  confirmed: z.literal(true, { error: 'Please confirm the information is accurate' }),
})

type FormValues = z.infer<typeof schema>

// ── File size formatter ────────────────────────────────────────────────────────

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB per file
const MAX_TOTAL_SIZE = 10 * 1024 * 1024 // 10 MB total

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')

  // Steps: 1 = personal details, 2 = financial verification (if required)
  const [step, setStep] = useState<1 | 2>(1)

  // Financial verification state — multi-file
  const [statementFiles, setStatementFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [aiConsent, setAiConsent] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Submission state
  const [submitState, setSubmitState] = useState<
    'idle' | 'submitting' | 'uploading' | 'analysing' | 'declarations' | 'done' | 'failed' | 'error'
  >('idle')
  const [scoring, setScoring] = useState<ScoringResult | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  // Declarations state
  const [declarations, setDeclarations] = useState<Record<number, { relationship: string; custom: string }>>({})

  // Guard against double submission
  const submittingRef = useRef(false)

  // Polling ref for cleanup
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch(`/api/tenant/apply/property/${propertyId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error || !json.data) { setLoadState('error'); return }
        setProperty(json.data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }, [propertyId])

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // ── Step 1 submit (personal details) ────────────────────────────────────────

  async function onStep1Submit(values: FormValues) {
    if (property?.requireFinancialVerification) {
      setStep(2)
      return
    }
    // No financial verification required — submit directly
    await submitApplication(values, [])
  }

  // ── File handling (multi-file) ────────────────────────────────────────────────

  function handleFilesSelect(newFiles: File[]) {
    setFileError(null)

    for (const f of newFiles) {
      if (f.type !== 'application/pdf') continue
      if (f.size > MAX_FILE_SIZE) {
        setFileError('File too large. Maximum 10 MB per file.')
        return
      }
    }

    const validFiles = newFiles.filter((f) => f.type === 'application/pdf' && f.size <= MAX_FILE_SIZE)
    const combined = [...statementFiles, ...validFiles]

    if (combined.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files allowed. You selected ${combined.length}.`)
      return
    }

    const combinedTotal = combined.reduce((sum, f) => sum + f.size, 0)
    if (combinedTotal > MAX_TOTAL_SIZE) {
      setFileError('Total upload size cannot exceed 10 MB. Please reduce the number of files or upload a combined statement instead.')
      return
    }

    setStatementFiles(combined)
  }

  function removeFile(index: number) {
    setStatementFiles((prev) => prev.filter((_, i) => i !== index))
    setFileError(null)
  }

  function onFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFilesSelect(files)
  }

  // ── Final submission ─────────────────────────────────────────────────────────

  async function submitApplication(values: FormValues, files: File[]) {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitState('submitting')

    // 1. Create Candidate record
    const res = await fetch('/api/tenant/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        currentAddress: values.currentAddress,
        employmentStatus: values.employmentStatus,
        monthlyIncome: values.monthlyIncome,
        message: values.message || undefined,
      }),
    })

    if (!res.ok) { submittingRef.current = false; setSubmitState('error'); return }

    const json = await res.json()
    const newTenantId: string | undefined = json.data?.tenantId

    // 2. If no files required, we're done
    if (files.length === 0) { setSubmitState('done'); return }

    // 3. Upload statements and trigger scoring
    setSubmitState('uploading')
    const fd = new FormData()
    for (const file of files) {
      fd.append('file', file)
    }
    fd.append('propertyId', propertyId)
    if (newTenantId) fd.append('tenantId', newTenantId)
    fd.append('reportType', 'LANDLORD_REQUESTED')
    fd.append('applicantName', values.name)
    if (values.monthlyIncome) fd.append('declaredIncome', values.monthlyIncome)

    const uploadRes = await fetch('/api/scoring/upload', { method: 'POST', body: fd })
    if (!uploadRes.ok) { setSubmitState('done'); return } // don't block submission on scoring failure

    const uploadJson = await uploadRes.json()
    const newReportId: string = uploadJson.data?.reportId
    setReportId(newReportId)
    setSubmitState('analysing')

    // 4. Poll for scoring results
    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/scoring/${newReportId}`)
      if (!pollRes.ok) return
      const pollJson = await pollRes.json()
      const data: ScoringResult = pollJson.data
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        if (pollRef.current) clearInterval(pollRef.current)
        setScoring(data)
        if (data.status === 'FAILED') {
          setSubmitState('failed')
        } else if (data.hasUnverifiedFiles) {
          setSubmitState('declarations')
        } else {
          setSubmitState('done')
        }
      }
    }, 5000)
  }

  async function onStep2Submit() {
    const values = getValues()
    await submitApplication(values, statementFiles)
  }

  // ── Declarations submit ────────────────────────────────────────────────────

  async function onDeclarationsSubmit() {
    if (!reportId || !scoring?.statementFiles) return

    const unverifiedFiles = scoring.statementFiles.filter(
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

    const res = await fetch(`/api/scoring/${reportId}/declarations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ declarations: declPayload }),
    })

    if (res.ok) {
      setSubmitState('done')
    }
  }

  // ── Try again from failed state ────────────────────────────────────────────

  function handleTryAgain() {
    submittingRef.current = false
    setSubmitState('idle')
    setScoring(null)
    setReportId(null)
    setStatementFiles([])
    setAiConsent(false)
    setStep(2)
  }

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loadState === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadState === 'error' || !property) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <h1 className="text-gray-900 font-bold text-xl mb-2">Property not found</h1>
          <p className="text-gray-500 text-sm">This application link is invalid. Please check the link and try again.</p>
        </div>
      </div>
    )
  }

  const address = [property.name ?? property.line1, property.city, property.postcode].filter(Boolean).join(', ')
  const fullAddress = [property.line1, property.city, property.postcode].filter(Boolean).join(', ')

  // ── Analysing state (animated progress screen) ─────────────────────────────

  if (submitState === 'analysing') {
    return (
      <ScoringProgressScreen
        fileCount={statementFiles.length}
        isComplete={false}
      />
    )
  }

  // ── Failed state ───────────────────────────────────────────────────────────

  if (submitState === 'failed') {
    const failureReason = scoring?.failureReason ?? 'Something went wrong during analysis.'

    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="mx-auto" />
          </div>

          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h1 className="text-gray-900 font-bold text-lg">Analysis could not be completed</h1>
              </div>
            </div>

            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-5">
              <p className="text-sm text-red-700">{failureReason}</p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleTryAgain}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold rounded-xl py-3 text-sm transition-colors"
              >
                Try again with different files
              </button>
              <a
                href="mailto:hello@letsorted.co.uk"
                className="block w-full text-center border border-gray-200 text-gray-600 font-semibold rounded-xl py-3 text-sm hover:bg-gray-50 transition-colors"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Declarations state ─────────────────────────────────────────────────────

  if (submitState === 'declarations' && scoring?.statementFiles) {
    const unverifiedFiles = scoring.statementFiles.filter(
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
      <div className="flex-1 py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="mx-auto" />
          </div>

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
                        placeholder="Describe the relationship…"
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
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors mt-5"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Done state ───────────────────────────────────────────────────────────────

  if (submitState === 'done') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-2">Application received</h1>
          <p className="text-gray-500 text-sm">
            Thanks for applying for <strong>{fullAddress}</strong>. Your landlord will review your application and be in touch shortly.
          </p>
        </div>
      </div>
    )
  }

  // ── Step progress indicator ──────────────────────────────────────────────────

  const totalSteps = property.requireFinancialVerification ? 2 : 1

  return (
    <div className="flex-1 py-10 px-4">
      <div className="max-w-lg mx-auto">

        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="mx-auto" />
        </div>

        {/* Property banner */}
        <div className="bg-[#0f1a0f] rounded-xl px-4 py-3 mb-6 text-center">
          <p className="text-white/50 text-xs uppercase tracking-wide font-medium mb-0.5">Applying for</p>
          <p className="text-white font-semibold">{address}</p>
        </div>

        {/* Step indicator */}
        {totalSteps > 1 && (
          <div className="flex items-center gap-2 mb-6 px-1">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors
                  ${step >= s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-gray-800' : 'text-gray-400'}`}>
                  {s === 1 ? 'Your details' : 'Verify finances'}
                </span>
                {s < totalSteps && <div className="flex-1 h-px bg-gray-200" />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          {/* ── STEP 1: Personal Details ──────────────────────────────────────── */}

          {step === 1 && (
            <>
              <h1 className="text-gray-900 font-bold text-xl mb-5">Your application</h1>
              <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">

                <div>
                  <Label htmlFor="name">Full name</Label>
                  <input id="name" {...register('name')} className={inputClass} placeholder="Jane Smith" />
                  <FieldError message={errors.name?.message} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <input id="email" type="email" {...register('email')} className={inputClass} placeholder="jane@example.com" />
                    <FieldError message={errors.email?.message} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <input id="phone" type="tel" {...register('phone')} className={inputClass} placeholder="07700 900000" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="currentAddress">Current address</Label>
                  <input id="currentAddress" {...register('currentAddress')} className={inputClass} placeholder="12 High Street, Manchester, M1 1AA" />
                  <FieldError message={errors.currentAddress?.message} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employmentStatus">Employment status</Label>
                    <select id="employmentStatus" {...register('employmentStatus')} className={selectClass}>
                      <option value="">Select…</option>
                      <option value="EMPLOYED">Employed</option>
                      <option value="SELF_EMPLOYED">Self-employed</option>
                      <option value="STUDENT">Student</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <FieldError message={errors.employmentStatus?.message} />
                  </div>
                  <div>
                    <Label htmlFor="monthlyIncome">Monthly income (£)</Label>
                    <input id="monthlyIncome" type="number" min={0} {...register('monthlyIncome')} className={inputClass} placeholder="2500" />
                    <FieldError message={errors.monthlyIncome?.message} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Message to landlord <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <textarea
                    id="message"
                    {...register('message')}
                    rows={4}
                    className={`${inputClass} resize-none`}
                    placeholder="Tell the landlord about yourself, your ideal move-in date, whether you have pets, etc."
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer pt-1">
                  <input type="checkbox" {...register('confirmed')} className="mt-0.5 w-4 h-4 accent-green-600" />
                  <span className="text-sm text-gray-600">I confirm the information above is accurate to the best of my knowledge</span>
                </label>
                {errors.confirmed && <p className="text-xs text-red-500">{errors.confirmed.message as string}</p>}

                {submitState === 'error' && (
                  <p className="text-sm text-red-500">Something went wrong — please try again</p>
                )}

                <button
                  type="submit"
                  disabled={submitState === 'submitting'}
                  className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors mt-2"
                >
                  {property.requireFinancialVerification ? 'Continue →' : 'Submit application'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: Financial Verification (Multi-file) ───────────────────── */}

          {step === 2 && (
            <>
              <h1 className="text-gray-900 font-bold text-xl mb-1">Verify your finances</h1>
              <p className="text-gray-500 text-sm mb-5">This landlord requires financial verification. Upload your bank statements to continue.</p>

              {/* Option A — Open Banking (coming soon) */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 mb-3 opacity-60 cursor-not-allowed select-none">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🏦</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-gray-700">Connect your UK bank</span>
                      <span className="text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">Coming soon</span>
                    </div>
                    <p className="text-xs text-gray-500">Instant and secure via Open Banking</p>
                  </div>
                </div>
              </div>

              {/* Option B — Upload statements (multi-file) */}
              <div
                className={`rounded-xl border-2 px-4 py-4 mb-3 transition-colors
                  ${statementFiles.length > 0
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 bg-white'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onFileDrop}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">📄</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-800 mb-0.5">Upload bank statements</div>
                    <p className="text-xs text-gray-500">Upload up to {MAX_FILES} PDF files, 10 MB total. Most bank statements are well under this limit.</p>
                  </div>
                  {statementFiles.length > 0 && (
                    <span className="text-xs font-medium text-green-600 bg-green-100 rounded-full px-2.5 py-1 shrink-0">
                      {statementFiles.length} of {MAX_FILES}
                    </span>
                  )}
                </div>

                {/* File list */}
                {statementFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {statementFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs text-gray-700 font-medium truncate">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-400">{fmtBytes(file.size)}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Remove file"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 text-right">
                      Total: {fmtBytes(statementFiles.reduce((sum, f) => sum + f.size, 0))} of 10 MB max
                    </p>
                  </div>
                )}

                {/* Drop zone (shown when under limit) */}
                {statementFiles.length < MAX_FILES && (
                  <div
                    className={`mt-3 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer
                      ${isDragging ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <p className="text-xs text-gray-500">
                      Drag and drop your PDFs here, or{' '}
                      <span className="text-green-600 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Any bank, any country, any language</p>
                    <p className="text-xs text-gray-300 mt-1">PDF only · 10 MB max per file · 10 MB total</p>
                  </div>
                )}
              </div>

              {/* File error */}
              {fileError && (
                <p className="text-xs text-red-500 mb-3">{fileError}</p>
              )}

              {/* Info box */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-5">
                <p className="text-xs text-amber-700">
                  <strong>Tip:</strong> If your bank provides one PDF per month, upload them all (up to {MAX_FILES}). If you have a single PDF covering multiple months, that works too.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : []
                  if (files.length > 0) handleFilesSelect(files)
                  e.target.value = ''
                }}
              />

              <label className="flex items-start gap-3 cursor-pointer mb-5">
                <input
                  type="checkbox"
                  checked={aiConsent}
                  onChange={(e) => setAiConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-green-600"
                />
                <span className="text-sm text-gray-600">
                  I consent to my bank statements being processed by{' '}
                  <a
                    href="/privacy#ai-processing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-green-700 hover:text-green-800"
                  >
                    AI
                  </a>{' '}
                  to generate a financial score for this rental application. Data is not retained after analysis is complete.
                </span>
              </label>

              {submitState === 'error' && (
                <p className="text-sm text-red-500 mb-3">Something went wrong — please try again</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold rounded-xl py-3 text-sm hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={statementFiles.length === 0 || !aiConsent || submitState === 'submitting' || submitState === 'uploading'}
                  onClick={onStep2Submit}
                  className="flex-2 flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {submitState === 'uploading' ? 'Uploading…' : submitState === 'submitting' ? 'Submitting…' : 'Submit application'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
