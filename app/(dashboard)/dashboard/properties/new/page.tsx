'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// ── Shared field styles ───────────────────────────────────────────────────────

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-[#1A1A1A] placeholder-gray-400 text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors'

const selectClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors appearance-none'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-[#374151] mb-1.5">
      {children}
    </label>
  )
}

// ── Step pill indicator ───────────────────────────────────────────────────────

function StepPills({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
            n === current
              ? 'bg-[#16a34a] text-white'
              : n < current
              ? 'bg-[#16a34a]/15 text-[#16a34a]'
              : 'bg-gray-100 text-[#9CA3AF]'
          }`}
        >
          {n < current ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            n
          )}
        </div>
      ))}
    </div>
  )
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const propertySchema = z.object({
  name: z.string().optional(),
  line1: z.string().min(1, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  postcode: z.string().min(5, 'Enter a valid postcode'),
  type: z.enum(['FLAT', 'HOUSE', 'HMO', 'OTHER']),
})

const tenantSchema = z.object({
  tenantName: z.string().min(1, 'Required'),
  tenantEmail: z.string().email('Enter a valid email'),
  tenantPhone: z.string().optional(),
  monthlyRentStr: z.string().min(1, 'Required'),
  paymentDay: z.number().int().min(1).max(31),
  startDate: z.string().min(1, 'Required'),
})

type PropertyValues = z.infer<typeof propertySchema>
type TenantValues = z.infer<typeof tenantSchema>

interface OsAddress {
  uprn: string
  singleLine: string
  line1: string
  line2: string | null
  city: string
  postcode: string
}

// ── Step 1 — Property ─────────────────────────────────────────────────────────

function PropertyForm({ onNext }: { onNext: (v: PropertyValues) => void }) {
  const [lookupLoading, setLookupLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<OsAddress[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<PropertyValues>({ resolver: zodResolver(propertySchema), defaultValues: { type: 'FLAT' } })

  const postcode = watch('postcode')

  async function lookupAddress() {
    if (!postcode || postcode.length < 5) return
    setLookupLoading(true)
    try {
      const res = await fetch(`/api/address?postcode=${encodeURIComponent(postcode)}`)
      const json = await res.json()
      if (json.data?.length > 0) { setSuggestions(json.data); setShowSuggestions(true) }
    } catch { /* silent */ } finally { setLookupLoading(false) }
  }

  function selectAddress(addr: OsAddress) {
    if (addr.line1) setValue('line1', addr.line1)
    if (addr.line2) setValue('line2', addr.line2)
    setValue('city', addr.city)
    setValue('postcode', addr.postcode)
    setShowSuggestions(false)
  }

  return (
    <form id="wizard-form" onSubmit={handleSubmit(onNext)} className="space-y-3.5">
      <div>
        <Label htmlFor="postcode">Postcode</Label>
        <div className="flex gap-2">
          <input id="postcode" {...register('postcode')} placeholder="e.g. SW1A 2AA" className={`${inputClass} flex-1`} />
          <button type="button" onClick={lookupAddress} disabled={lookupLoading}
            className="shrink-0 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-[#1A1A1A] text-sm px-4 py-2.5 rounded-lg transition-colors">
            {lookupLoading ? '…' : 'Find'}
          </button>
        </div>
        <FieldError message={errors.postcode?.message} />
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto shadow-lg">
            {suggestions.map((addr) => (
              <button key={addr.uprn} type="button" onClick={() => selectAddress(addr)}
                className="w-full text-left px-3.5 py-2.5 text-sm text-[#374151] hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                {addr.singleLine}
              </button>
            ))}
            <button type="button" onClick={() => setShowSuggestions(false)}
              className="w-full text-center px-3.5 py-2 text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
              Enter manually
            </button>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="line1">Address line 1</Label>
        <input id="line1" {...register('line1')} placeholder="e.g. 12 High Street" className={inputClass} />
        <FieldError message={errors.line1?.message} />
      </div>

      <div>
        <Label htmlFor="line2">
          Address line 2 <span className="text-[#9CA3AF]">(optional)</span>
        </Label>
        <input id="line2" {...register('line2')} placeholder="Flat, suite, unit, etc." className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="city">Town / City</Label>
          <input id="city" {...register('city')} placeholder="Manchester" className={inputClass} />
          <FieldError message={errors.city?.message} />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <select id="type" {...register('type')} className={selectClass}>
            <option value="FLAT">Flat / Apartment</option>
            <option value="HOUSE">House</option>
            <option value="HMO">HMO</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="name">
          Nickname <span className="text-[#9CA3AF]">(optional)</span>
        </Label>
        <input id="name" {...register('name')} placeholder="e.g. The Manchester Flat" className={inputClass} />
      </div>

      <div className="pt-2">
        <button type="submit" className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors">
          Continue
        </button>
      </div>
    </form>
  )
}

// ── Step 2 — Occupancy ────────────────────────────────────────────────────────

function OccupancyStep({ onHasTenant, onVacant }: { onHasTenant: () => void; onVacant: () => void }) {
  return (
    <div className="space-y-3">
      <button onClick={onHasTenant}
        className="w-full flex items-center gap-4 bg-white border border-gray-200 hover:border-[#16a34a]/30 hover:bg-gray-50 rounded-xl p-4 text-left transition-all">
        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
          <svg className="w-4.5 h-4.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-[#1A1A1A] font-medium text-sm flex-1">Yes, I have a tenant</p>
        <svg className="w-4 h-4 text-[#D1D5DB] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button onClick={onVacant}
        className="w-full flex items-center gap-4 bg-white border border-gray-200 hover:border-[#16a34a]/30 hover:bg-gray-50 rounded-xl p-4 text-left transition-all">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <svg className="w-4.5 h-4.5 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <p className="text-[#1A1A1A] font-medium text-sm flex-1">No, it&apos;s vacant</p>
        <svg className="w-4 h-4 text-[#D1D5DB] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

// ── Step 3 — Tenant details ───────────────────────────────────────────────────

function TenantForm({ onNext, onBack, submitting }: { onNext: (v: TenantValues) => void; onBack: () => void; submitting: boolean }) {
  const { register, handleSubmit, formState: { errors } } =
    useForm<TenantValues>({ resolver: zodResolver(tenantSchema), defaultValues: { paymentDay: 1 } })

  return (
    <form id="wizard-form" onSubmit={handleSubmit(onNext)} className="space-y-3.5">
      <div>
        <Label htmlFor="tenantName">Full name</Label>
        <input id="tenantName" {...register('tenantName')} placeholder="Jane Smith" className={inputClass} />
        <FieldError message={errors.tenantName?.message} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tenantEmail">Email</Label>
          <input id="tenantEmail" type="email" {...register('tenantEmail')} placeholder="jane@example.com" className={inputClass} />
          <FieldError message={errors.tenantEmail?.message} />
        </div>
        <div>
          <Label htmlFor="tenantPhone">
            Phone <span className="text-[#9CA3AF]">(optional)</span>
          </Label>
          <input id="tenantPhone" type="tel" {...register('tenantPhone')} placeholder="07700 900000" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="monthlyRentStr">Monthly rent (£)</Label>
          <input id="monthlyRentStr" {...register('monthlyRentStr')} placeholder="1200" className={inputClass} />
          <FieldError message={errors.monthlyRentStr?.message} />
        </div>
        <div>
          <Label htmlFor="paymentDay">Payment day</Label>
          <input id="paymentDay" type="number" min={1} max={31}
            {...register('paymentDay', { valueAsNumber: true })} className={inputClass} />
          <FieldError message={errors.paymentDay?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="startDate">Start date</Label>
        <input id="startDate" type="date" {...register('startDate')} className={inputClass} />
        <FieldError message={errors.startDate?.message} />
      </div>

      <div className="pt-2 flex flex-col gap-3">
        <button type="submit" disabled={submitting} className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors">
          {submitting ? 'Saving…' : 'Add property'}
        </button>
        <button type="button" onClick={onBack} className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors text-center">
          ← Back
        </button>
      </div>
    </form>
  )
}

// ── Step headings ─────────────────────────────────────────────────────────────

const stepHeadings: Record<number, string> = {
  1: 'Add a property',
  2: 'Is it currently let?',
  3: 'Tenant details',
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function NewPropertyPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [propertyData, setPropertyData] = useState<PropertyValues | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createProperty(data: PropertyValues): Promise<string | null> {
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to create property'); return null }
    return json.data.id as string
  }

  function handleStep1(values: PropertyValues) {
    setPropertyData(values)
    setStep(2)
  }

  async function handleVacant() {
    if (!propertyData) return
    setSubmitting(true); setError(null)
    const id = await createProperty(propertyData)
    setSubmitting(false)
    if (id) router.push('/dashboard')
  }

  async function handleStep3(tenantValues: TenantValues) {
    if (!propertyData) return
    setSubmitting(true); setError(null)

    const propertyId = await createProperty(propertyData)
    if (!propertyId) { setSubmitting(false); return }

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
      const json = await tenancyRes.json()
      setError(json.error ?? 'Failed to save tenant details')
      return
    }
    router.push('/dashboard')
  }

  const totalSteps = 3
  const heading = stepHeadings[step]

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] lg:min-h-screen">

      {/* TOP — pill indicator + heading */}
      <div className="px-4 pt-8 pb-6 border-b border-gray-100">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <StepPills current={step} total={totalSteps} />
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              Cancel
            </button>
          </div>
          <h1 className="text-[#1A1A1A] text-xl font-semibold">{heading}</h1>
        </div>
      </div>

      {/* MIDDLE — form */}
      <div className="flex-1 px-4 py-6 overflow-auto">
        <div className="max-w-lg mx-auto">

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {submitting && step !== 3 ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : step === 1 ? (
            <PropertyForm onNext={handleStep1} />
          ) : step === 2 ? (
            <OccupancyStep onHasTenant={() => setStep(3)} onVacant={handleVacant} />
          ) : (
            <TenantForm onNext={handleStep3} onBack={() => setStep(2)} submitting={submitting} />
          )}

        </div>
      </div>

    </div>
  )
}
