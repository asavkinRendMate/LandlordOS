'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// ── Styles ────────────────────────────────────────────────────────────────────

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors'

const selectClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors appearance-none'

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

interface ScoringResult {
  status: string
  totalScore: number | null
  grade: string | null
  aiSummary: string | null
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

// ── Grade colour helper ────────────────────────────────────────────────────────

function gradeColour(grade: string | null) {
  if (!grade) return 'text-gray-600 bg-gray-50 border-gray-200'
  if (grade === 'Excellent' || grade === 'Good') return 'text-green-700 bg-green-50 border-green-200'
  if (grade === 'Fair') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (grade === 'Poor') return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

// ── File size formatter ────────────────────────────────────────────────────────

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')

  // Steps: 1 = personal details, 2 = financial verification (if required)
  const [step, setStep] = useState<1 | 2>(1)

  // Financial verification state
  const [statementFile, setStatementFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Submission state
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'uploading' | 'analysing' | 'done' | 'error'>('idle')
  const [scoring, setScoring] = useState<ScoringResult | null>(null)

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
    await submitApplication(values, null)
  }

  // ── File handling ────────────────────────────────────────────────────────────

  function handleFileSelect(file: File) {
    if (file.type !== 'application/pdf') return
    if (file.size > 20 * 1024 * 1024) return
    setStatementFile(file)
  }

  function onFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // ── Final submission ─────────────────────────────────────────────────────────

  async function submitApplication(values: FormValues, file: File | null) {
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

    if (!res.ok) { setSubmitState('error'); return }

    const json = await res.json()
    const newTenantId: string | undefined = json.data?.tenantId

    // 2. If no file required, we're done
    if (!file) { setSubmitState('done'); return }

    // 3. Upload statement and trigger scoring
    setSubmitState('uploading')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('propertyId', propertyId)
    if (newTenantId) fd.append('tenantId', newTenantId)
    fd.append('reportType', 'LANDLORD_REQUESTED')

    const uploadRes = await fetch('/api/scoring/upload', { method: 'POST', body: fd })
    if (!uploadRes.ok) { setSubmitState('done'); return } // don't block submission on scoring failure

    const uploadJson = await uploadRes.json()
    const newReportId: string = uploadJson.data?.reportId
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
        setSubmitState('done')
      }
    }, 5000)
  }

  async function onStep2Submit() {
    const values = getValues()
    await submitApplication(values, statementFile)
  }

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadState === 'error' || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <h1 className="text-gray-900 font-bold text-xl mb-2">Property not found</h1>
          <p className="text-gray-500 text-sm">This application link is invalid. Please check the link and try again.</p>
        </div>
      </div>
    )
  }

  const address = [property.name ?? property.line1, property.city, property.postcode].filter(Boolean).join(', ')
  const fullAddress = [property.line1, property.city, property.postcode].filter(Boolean).join(', ')

  // ── Analysing state ──────────────────────────────────────────────────────────

  if (submitState === 'analysing' && !scoring) {
    return (
      <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-2">Application submitted</h1>
          <p className="text-gray-600 text-sm mb-4">
            We&apos;re analysing your bank statement — this usually takes 1–2 minutes.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            Analysing finances…
          </div>
        </div>
      </div>
    )
  }

  // ── Done state ───────────────────────────────────────────────────────────────

  if (submitState === 'done') {
    return (
      <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-2">Application received</h1>
          {scoring?.status === 'COMPLETED' && scoring.totalScore !== null ? (
            <div className="mt-4 text-left">
              <div className={`rounded-xl border px-5 py-4 mb-3 ${gradeColour(scoring.grade)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-2xl">{scoring.totalScore}/100</span>
                  <span className="font-semibold text-sm">{scoring.grade}</span>
                </div>
                {scoring.aiSummary && (
                  <p className="text-sm mt-2 leading-relaxed">{scoring.aiSummary}</p>
                )}
              </div>
              <p className="text-gray-500 text-xs text-center">Your landlord will review your application shortly.</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Thanks for applying for <strong>{fullAddress}</strong>. The landlord will be in touch if your application is successful.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Step progress indicator ──────────────────────────────────────────────────

  const totalSteps = property.requireFinancialVerification ? 2 : 1

  return (
    <div className="min-h-screen bg-[#f0f7f4] py-10 px-4">
      <div className="max-w-lg mx-auto">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-[#0f1a0f] font-bold text-xl tracking-tight">LetSorted</span>
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

          {/* ── STEP 2: Financial Verification ───────────────────────────────── */}

          {step === 2 && (
            <>
              <h1 className="text-gray-900 font-bold text-xl mb-1">Verify your finances</h1>
              <p className="text-gray-500 text-sm mb-5">This landlord requires financial verification. Upload your bank statement to continue.</p>

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

              {/* Option B — Upload statement */}
              <div
                className={`rounded-xl border-2 px-4 py-4 mb-5 cursor-pointer transition-colors
                  ${statementFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 bg-white'}`}
                onClick={() => !statementFile && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onFileDrop}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">📄</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-800 mb-0.5">Upload bank statement</div>
                    <p className="text-xs text-gray-500">Works for any bank, including international banks</p>
                  </div>
                </div>

                {statementFile ? (
                  <div className="mt-3 flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs text-gray-700 font-medium truncate">{statementFile.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{fmtBytes(statementFile.size)}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setStatementFile(null) }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Remove file"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`mt-3 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors
                    ${isDragging ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <p className="text-xs text-gray-500">
                      Drag and drop your PDF here, or{' '}
                      <span className="text-green-600 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Upload your last 6 months of bank statements. Any bank, any country, any language.</p>
                    <p className="text-xs text-gray-300 mt-1">PDF only · Max 20 MB</p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />

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
                  disabled={!statementFile || submitState === 'submitting' || submitState === 'uploading'}
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
