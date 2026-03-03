'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// ── Schemas ───────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Town / city is required'),
  postcode: z.string().min(5, 'Enter a valid postcode'),
  type: z.enum(['FLAT', 'HOUSE', 'HMO', 'OTHER']),
})

const step3Schema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  tenantEmail: z.string().email('Enter a valid email'),
  tenantPhone: z.string().optional(),
  monthlyRentStr: z.string().min(1, 'Monthly rent is required'),
  paymentDay: z.number().int().min(1).max(31),
  startDate: z.string().min(1, 'Start date is required'),
})

type Step1Values = z.infer<typeof step1Schema>
type Step3Values = z.infer<typeof step3Schema>

// ── Address lookup ────────────────────────────────────────────────────────────

interface OsAddress {
  uprn: string
  singleLine: string
  line1: string
  line2: string | null
  city: string
  postcode: string
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-400">{message}</p>
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-white/70 mb-1.5">
      {children}
    </label>
  )
}

const inputClass =
  'w-full bg-[#5f655f] border border-white/15 rounded-lg px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors'

const selectClass =
  'w-full bg-[#5f655f] border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors appearance-none'

// ── Step 1 — Property address ─────────────────────────────────────────────────

function Step1({
  onNext,
}: {
  onNext: (values: Step1Values) => void
}) {
  const [lookupLoading, setLookupLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<OsAddress[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { type: 'FLAT' },
  })

  const postcode = watch('postcode')

  async function lookupAddress() {
    if (!postcode || postcode.length < 5) return
    setLookupLoading(true)
    try {
      const res = await fetch(`/api/address?postcode=${encodeURIComponent(postcode)}`)
      const json = await res.json()
      if (json.data?.length > 0) {
        setSuggestions(json.data)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
      }
    } catch {
      // Silent — user can fill in manually
    } finally {
      setLookupLoading(false)
    }
  }

  function selectAddress(addr: OsAddress) {
    setValue('line1', addr.line1, { shouldValidate: true })
    setValue('line2', addr.line2 ?? '', { shouldValidate: true })
    setValue('city', addr.city, { shouldValidate: true })
    setValue('postcode', addr.postcode, { shouldValidate: true })
    setShowSuggestions(false)
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Postcode lookup */}
      <div>
        <Label htmlFor="postcode">Postcode</Label>
        <div className="flex gap-2">
          <input
            id="postcode"
            {...register('postcode')}
            placeholder="e.g. SW1A 2AA"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={lookupAddress}
            disabled={lookupLoading}
            className="shrink-0 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            {lookupLoading ? '…' : 'Find'}
          </button>
        </div>
        <FieldError message={errors.postcode?.message} />

        {/* Address dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-2 bg-[#1a2d1a] border border-white/15 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            {suggestions.map((addr) => (
              <button
                key={addr.uprn}
                type="button"
                onClick={() => selectAddress(addr)}
                className="w-full text-left px-3.5 py-2.5 text-sm text-white/80 hover:bg-white/8 transition-colors border-b border-white/5 last:border-0"
              >
                {addr.singleLine}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="w-full text-center px-3.5 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Enter manually instead
            </button>
          </div>
        )}
      </div>

      {/* Address line 1 */}
      <div>
        <Label htmlFor="line1">Address line 1</Label>
        <input
          id="line1"
          {...register('line1')}
          placeholder="e.g. 12 High Street"
          className={inputClass}
        />
        <FieldError message={errors.line1?.message} />
      </div>

      {/* Address line 2 */}
      <div>
        <Label htmlFor="line2">Address line 2 <span className="text-white/30">(optional)</span></Label>
        <input
          id="line2"
          {...register('line2')}
          placeholder="Flat, suite, unit, etc."
          className={inputClass}
        />
      </div>

      {/* City */}
      <div>
        <Label htmlFor="city">Town / City</Label>
        <input
          id="city"
          {...register('city')}
          placeholder="e.g. Manchester"
          className={inputClass}
        />
        <FieldError message={errors.city?.message} />
      </div>

      {/* Property type */}
      <div>
        <Label htmlFor="type">Property type</Label>
        <select id="type" {...register('type')} className={selectClass}>
          <option value="FLAT">Flat / Apartment</option>
          <option value="HOUSE">House</option>
          <option value="HMO">HMO</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors mt-2"
      >
        Continue
      </button>
    </form>
  )
}

// ── Step 2 — Tenancy status ───────────────────────────────────────────────────

function Step2({
  onNext,
  onSkip,
}: {
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">Does this property currently have tenants?</p>

      <button
        onClick={onNext}
        className="w-full flex items-start gap-4 bg-white/5 hover:bg-white/8 border border-white/12 hover:border-white/20 rounded-xl p-4 text-left transition-all"
      >
        <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-medium text-sm">Yes, it has tenants</p>
          <p className="text-white/40 text-xs mt-0.5">Add their details so you can track rent and compliance</p>
        </div>
      </button>

      <button
        onClick={onSkip}
        className="w-full flex items-start gap-4 bg-white/5 hover:bg-white/8 border border-white/12 hover:border-white/20 rounded-xl p-4 text-left transition-all"
      >
        <div className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div>
          <p className="text-white font-medium text-sm">No, it&apos;s vacant</p>
          <p className="text-white/40 text-xs mt-0.5">You can add tenants later when you find them</p>
        </div>
      </button>
    </div>
  )
}

// ── Step 3 — Tenant details ───────────────────────────────────────────────────

function Step3({
  onNext,
}: {
  onNext: (values: Step3Values) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: { paymentDay: 1 },
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="tenantName">Tenant&apos;s full name</Label>
          <input
            id="tenantName"
            {...register('tenantName')}
            placeholder="Jane Smith"
            className={inputClass}
          />
          <FieldError message={errors.tenantName?.message} />
        </div>

        <div>
          <Label htmlFor="tenantEmail">Email</Label>
          <input
            id="tenantEmail"
            type="email"
            {...register('tenantEmail')}
            placeholder="jane@example.com"
            className={inputClass}
          />
          <FieldError message={errors.tenantEmail?.message} />
        </div>

        <div>
          <Label htmlFor="tenantPhone">Phone <span className="text-white/30">(optional)</span></Label>
          <input
            id="tenantPhone"
            type="tel"
            {...register('tenantPhone')}
            placeholder="07700 900000"
            className={inputClass}
          />
        </div>

        <div>
          <Label htmlFor="monthlyRentStr">Monthly rent (£)</Label>
          <input
            id="monthlyRentStr"
            {...register('monthlyRentStr')}
            placeholder="1200"
            className={inputClass}
          />
          <FieldError message={errors.monthlyRentStr?.message} />
        </div>

        <div>
          <Label htmlFor="paymentDay">Payment day of month</Label>
          <input
            id="paymentDay"
            type="number"
            min={1}
            max={31}
            {...register('paymentDay', { valueAsNumber: true })}
            className={inputClass}
          />
          <FieldError message={errors.paymentDay?.message} />
        </div>

        <div className="col-span-2">
          <Label htmlFor="startDate">Tenancy start date</Label>
          <input
            id="startDate"
            type="date"
            {...register('startDate')}
            className={inputClass}
          />
          <FieldError message={errors.startDate?.message} />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
      >
        Add property
      </button>
    </form>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [propertyData, setPropertyData] = useState<Step1Values | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = [
    { n: 1, label: 'Property' },
    { n: 2, label: 'Tenancy' },
    { n: 3, label: 'Tenant' },
  ]

  async function createProperty(data: Step1Values): Promise<string | null> {
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to create property')
      return null
    }
    return json.data.id as string
  }

  async function handleStep1(values: Step1Values) {
    setPropertyData(values)
    setStep(2)
  }

  async function handleVacant() {
    // No tenants — just create the property and go to dashboard
    if (!propertyData) return
    setSubmitting(true)
    setError(null)
    const id = await createProperty(propertyData)
    setSubmitting(false)
    if (id) router.push('/dashboard')
  }

  async function handleStep3(tenantValues: Step3Values) {
    if (!propertyData) return
    setSubmitting(true)
    setError(null)

    const propertyId = await createProperty(propertyData)
    if (!propertyId) {
      setSubmitting(false)
      return
    }

    // Monthly rent: convert pounds string → pence
    const monthlyRent = Math.round(parseFloat(tenantValues.monthlyRentStr) * 100)

    const tenancyRes = await fetch('/api/tenancies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        tenantName: tenantValues.tenantName,
        tenantEmail: tenantValues.tenantEmail,
        tenantPhone: tenantValues.tenantPhone || undefined,
        monthlyRent,
        paymentDay: tenantValues.paymentDay,
        startDate: new Date(tenantValues.startDate).toISOString(),
      }),
    })

    setSubmitting(false)
    if (!tenancyRes.ok) {
      const j = await tenancyRes.json()
      setError(j.error ?? 'Failed to save tenant details')
      return
    }

    router.push('/dashboard')
  }

  const stepLabels: Record<number, string> = {
    1: 'Where is the property?',
    2: 'Current tenancy status',
    3: 'Tenant details',
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step > s.n
                    ? 'bg-green-500 text-white'
                    : step === s.n
                    ? 'bg-white text-[#0f1a0f]'
                    : 'bg-white/10 text-white/40'
                }`}
              >
                {step > s.n ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.n
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  step === s.n ? 'text-white' : 'text-white/30'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`h-px w-8 mx-1 ${step > s.n ? 'bg-green-500/60' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-white font-semibold text-lg mb-1">Add your property</h2>
          <p className="text-white/50 text-sm mb-6">{stepLabels[step]}</p>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {submitting ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : step === 1 ? (
            <Step1 onNext={handleStep1} />
          ) : step === 2 ? (
            <Step2 onNext={() => setStep(3)} onSkip={handleVacant} />
          ) : (
            <Step3 onNext={handleStep3} />
          )}
        </div>

        {/* Back link */}
        {step > 1 && !submitting && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="mt-4 text-sm text-white/30 hover:text-white/60 transition-colors mx-auto block"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}
