'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// ── Shared field styles ───────────────────────────────────────────────────────

const inputClass =
  'w-full bg-[#5f655f] border border-white/15 rounded-lg px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors'

const selectClass =
  'w-full bg-[#5f655f] border border-white/15 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors appearance-none'

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

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Your Property' },
  { id: 2, label: 'Occupancy' },
  { id: 3, label: 'Your Tenant' },
  { id: 4, label: 'All Done' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center flex-wrap gap-y-2">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              current === step.id
                ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                : current > step.id
                ? 'text-white/35'
                : 'text-white/20'
            }`}
          >
            {current > step.id && (
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {step.label}
          </div>
          {i < STEPS.length - 1 && (
            <span className={`mx-1 text-sm ${current > step.id ? 'text-green-500/40' : 'text-white/12'}`}>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const propertySchema = z.object({
  name: z.string().optional(),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Town / city is required'),
  postcode: z.string().min(5, 'Enter a valid postcode'),
  type: z.enum(['FLAT', 'HOUSE', 'HMO', 'OTHER']),
})

const tenantSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  tenantEmail: z.string().email('Enter a valid email'),
  tenantPhone: z.string().optional(),
  monthlyRentStr: z.string().min(1, 'Monthly rent is required'),
  paymentDay: z.number().int().min(1).max(31),
  startDate: z.string().min(1, 'Start date is required'),
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

// ── Step 1 — Property address ─────────────────────────────────────────────────

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
    setValue('line1', addr.line1, { shouldValidate: true })
    setValue('line2', addr.line2 ?? '', { shouldValidate: true })
    setValue('city', addr.city, { shouldValidate: true })
    setValue('postcode', addr.postcode, { shouldValidate: true })
    setShowSuggestions(false)
  }

  return (
    <form id="wizard-form" onSubmit={handleSubmit(onNext)} className="space-y-4">
      {/* Postcode lookup */}
      <div>
        <Label htmlFor="postcode">Postcode</Label>
        <div className="flex gap-2">
          <input id="postcode" {...register('postcode')} placeholder="e.g. SW1A 2AA" className={`${inputClass} flex-1`} />
          <button type="button" onClick={lookupAddress} disabled={lookupLoading}
            className="shrink-0 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-sm px-4 py-2.5 rounded-lg transition-colors">
            {lookupLoading ? '…' : 'Find'}
          </button>
        </div>
        <FieldError message={errors.postcode?.message} />
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-2 bg-[#1a2d1a] border border-white/15 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
            {suggestions.map((addr) => (
              <button key={addr.uprn} type="button" onClick={() => selectAddress(addr)}
                className="w-full text-left px-3.5 py-2.5 text-sm text-white/80 hover:bg-white/8 transition-colors border-b border-white/5 last:border-0">
                {addr.singleLine}
              </button>
            ))}
            <button type="button" onClick={() => setShowSuggestions(false)}
              className="w-full text-center px-3.5 py-2 text-xs text-white/40 hover:text-white/60 transition-colors">
              Enter manually instead
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
        <Label htmlFor="line2">Address line 2 <span className="text-white/30">(optional)</span></Label>
        <input id="line2" {...register('line2')} placeholder="Flat, suite, unit, etc." className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <Label htmlFor="name">Property nickname <span className="text-white/30">(optional)</span></Label>
        <input id="name" {...register('name')} placeholder="e.g. The Manchester Flat" className={inputClass} />
        <p className="mt-1 text-xs text-white/30">A friendly label shown on your dashboard</p>
      </div>
    </form>
  )
}

// ── Step 2 — Occupancy ────────────────────────────────────────────────────────

function OccupancyStep({ onHasTenant, onVacant }: { onHasTenant: () => void; onVacant: () => void }) {
  return (
    <div className="space-y-4">
      <button onClick={onHasTenant}
        className="w-full flex items-start gap-4 bg-white/5 hover:bg-white/8 border border-white/12 hover:border-white/22 rounded-xl p-5 text-left transition-all">
        <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-base">Yes, I have a tenant</p>
          <p className="text-white/45 text-sm mt-1">We&apos;ll set up rent tracking and a tenant portal straight away</p>
        </div>
        <svg className="w-5 h-5 text-white/25 ml-auto mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button onClick={onVacant}
        className="w-full flex items-start gap-4 bg-white/5 hover:bg-white/8 border border-white/12 hover:border-white/22 rounded-xl p-5 text-left transition-all">
        <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-base">No, it&apos;s vacant</p>
          <p className="text-white/45 text-sm mt-1">You can add tenants later when you find them</p>
        </div>
        <svg className="w-5 h-5 text-white/25 ml-auto mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

// ── Step 3 — Tenant details ───────────────────────────────────────────────────

function TenantForm({ onNext }: { onNext: (v: TenantValues) => void }) {
  const { register, handleSubmit, formState: { errors } } =
    useForm<TenantValues>({ resolver: zodResolver(tenantSchema), defaultValues: { paymentDay: 1 } })

  return (
    <form id="wizard-form" onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div>
        <Label htmlFor="tenantName">Full name</Label>
        <input id="tenantName" {...register('tenantName')} placeholder="Jane Smith" className={inputClass} />
        <FieldError message={errors.tenantName?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tenantEmail">Email</Label>
          <input id="tenantEmail" type="email" {...register('tenantEmail')} placeholder="jane@example.com" className={inputClass} />
          <FieldError message={errors.tenantEmail?.message} />
        </div>
        <div>
          <Label htmlFor="tenantPhone">Phone <span className="text-white/30">(optional)</span></Label>
          <input id="tenantPhone" type="tel" {...register('tenantPhone')} placeholder="07700 900000" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <Label htmlFor="startDate">Tenancy start date</Label>
        <input id="startDate" type="date" {...register('startDate')} className={inputClass} />
        <FieldError message={errors.startDate?.message} />
      </div>
    </form>
  )
}

// ── Step 4 — All done ─────────────────────────────────────────────────────────

function AllDone({ propertyId, portalToken }: { propertyId: string; portalToken?: string }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  async function copyPortalLink() {
    const url = `${window.location.origin}/portal/${portalToken}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const suggestions = [
    {
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Upload compliance documents',
      desc: 'Gas safety, EPC, EICR and How to Rent guide',
      action: <Link href={`/dashboard/properties/${propertyId}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">Go →</Link>,
    },
    ...(portalToken ? [{
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      title: 'Share the tenant portal link',
      desc: 'Your tenant can submit maintenance requests and view their tenancy',
      action: (
        <button onClick={copyPortalLink} className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium">
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      ),
    }] : []),
    {
      icon: (
        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      title: 'Explore your dashboard',
      desc: 'See your property overview and what comes next',
      action: <button onClick={() => router.push('/dashboard')} className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium">Go →</button>,
    },
  ]

  return (
    <div>
      {/* Checkmark */}
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center animate-pop-in">
          <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path className="animate-draw-check" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h2 className="text-white text-3xl font-bold text-center mb-2">You&apos;re all set!</h2>
      <p className="text-white/50 text-center mb-8">Your property is ready. Here&apos;s what you can do next:</p>

      <div className="space-y-3 mb-8">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-3 bg-white/4 border border-white/8 rounded-xl p-4">
            <div className="w-9 h-9 rounded-lg bg-white/6 flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{s.title}</p>
              <p className="text-white/40 text-xs mt-0.5">{s.desc}</p>
            </div>
            <div className="shrink-0 mt-0.5">{s.action}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/dashboard')}
        className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
      >
        Go to my dashboard →
      </button>
    </div>
  )
}

// ── Step config ───────────────────────────────────────────────────────────────

const stepContent = {
  1: {
    heading: "Let's add your first property",
    subtitle: "We'll use this to set up your compliance checklist, generate tenancy documents, and keep everything organised in one place.",
  },
  2: {
    heading: 'Is the property currently let?',
    subtitle: "This helps us set the right starting point. If you have a tenant, we'll set up rent tracking and give them their own portal straight away.",
  },
  3: {
    heading: 'Tell us about your tenant',
    subtitle: "We'll use this to send automatic rent reminders, give your tenant their own maintenance portal, and track payments — so you don't have to chase manually.",
  },
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [propertyData, setPropertyData] = useState<PropertyValues | null>(null)
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null)
  const [createdPortalToken, setCreatedPortalToken] = useState<string | undefined>()
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
    if (id) { setCreatedPropertyId(id); setStep(4) }
  }

  async function handleStep3(tenantValues: TenantValues) {
    if (!propertyData) return
    setSubmitting(true); setError(null)

    const propertyId = await createProperty(propertyData)
    if (!propertyId) { setSubmitting(false); return }
    setCreatedPropertyId(propertyId)

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
    const tenancyJson = await tenancyRes.json()
    if (!tenancyRes.ok) { setError(tenancyJson.error ?? 'Failed to save tenant details'); return }

    if (tenancyJson.data?.portalToken) setCreatedPortalToken(tenancyJson.data.portalToken)
    setStep(4)
  }

  // For step 1 and 3: submit button lives inside the form (form id="wizard-form")
  // For step 2: buttons are inline
  // For step 4: done screen has its own CTA

  const content = step < 4 ? stepContent[step as keyof typeof stepContent] : null
  const showBack = step === 3 && !submitting

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] lg:min-h-screen">

      {/* TOP — step indicator */}
      <div className="pt-8 pb-5 px-4 border-b border-white/6">
        <StepIndicator current={step} />
      </div>

      {/* MIDDLE — content */}
      <div className="flex-1 flex items-start justify-center px-4 py-10 overflow-auto">
        <div className="w-full max-w-lg">

          {/* Heading + subtitle (steps 1–3) */}
          {content && (
            <div className="mb-8">
              <h1 className="text-white text-2xl lg:text-3xl font-bold mb-3 leading-tight">
                {content.heading}
              </h1>
              <p className="text-white/50 text-base leading-relaxed">{content.subtitle}</p>
            </div>
          )}

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {submitting ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : step === 1 ? (
            <PropertyForm onNext={handleStep1} />
          ) : step === 2 ? (
            <OccupancyStep onHasTenant={() => setStep(3)} onVacant={handleVacant} />
          ) : step === 3 ? (
            <TenantForm onNext={handleStep3} />
          ) : (
            <AllDone propertyId={createdPropertyId ?? ''} portalToken={createdPortalToken} />
          )}
        </div>
      </div>

      {/* BOTTOM — navigation */}
      {(step === 1 || step === 3) && !submitting && (
        <div className="px-4 pb-8 flex flex-col items-center gap-3 max-w-lg mx-auto w-full">
          <button
            type="submit"
            form="wizard-form"
            className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {step === 1 ? 'Continue' : 'Add property'}
          </button>
          {showBack && (
            <button
              onClick={() => setStep(2)}
              className="text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              ← Back
            </button>
          )}
          {step === 1 && (
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-white/30 hover:text-white/60 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      )}

    </div>
  )
}
