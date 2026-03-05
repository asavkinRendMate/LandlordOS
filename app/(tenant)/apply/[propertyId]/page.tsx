'use client'

import { useEffect, useState } from 'react'
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

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

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setSubmitState('submitting')
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
    setSubmitState(res.ok ? 'done' : 'error')
  }

  // ── Loading / error ────────────────────────────────────────────────────────

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

  // ── Thank you ──────────────────────────────────────────────────────────────

  if (submitState === 'done') {
    const address = [property.line1, property.city, property.postcode].filter(Boolean).join(', ')
    return (
      <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-2">Application received</h1>
          <p className="text-gray-500 text-sm">
            Thanks for applying for <strong>{address}</strong>. The landlord will be in touch if your application is successful.
          </p>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const address = [property.name ?? property.line1, property.city, property.postcode].filter(Boolean).join(', ')

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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-gray-900 font-bold text-xl mb-5">Your application</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

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
              {submitState === 'submitting' ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
