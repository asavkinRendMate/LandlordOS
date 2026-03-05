'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// ── Styles ────────────────────────────────────────────────────────────────────

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors'

const inputReadOnlyClass =
  'w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-500 text-sm cursor-not-allowed'

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

interface TenantData {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  property: {
    line1: string
    line2: string | null
    city: string
    postcode: string
  }
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  confirmed: z.literal(true, { error: 'Please confirm your details are correct' }),
})

type FormValues = z.infer<typeof schema>

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TenantJoinPage() {
  const { token } = useParams<{ token: string }>()
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'invalid' | 'already_confirmed' | 'ready'>('loading')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    fetch(`/api/tenant/join/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error === 'already_confirmed') { setLoadState('already_confirmed'); return }
        if (json.error || !json.data) { setLoadState('invalid'); return }
        setTenant(json.data)
        reset({ name: json.data.name, phone: json.data.phone ?? '', confirmed: undefined })
        setLoadState('ready')
      })
      .catch(() => setLoadState('invalid'))
  }, [token, reset])

  async function onSubmit(values: FormValues) {
    setSubmitState('submitting')
    const res = await fetch(`/api/tenant/join/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name, phone: values.phone }),
    })
    setSubmitState(res.ok ? 'done' : 'error')
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-2">Link invalid or expired</h1>
          <p className="text-gray-500 text-sm">This link is invalid or has expired. Please ask your landlord to resend the invite.</p>
        </div>
      </div>
    )
  }

  if (loadState === 'already_confirmed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-2">Already confirmed</h1>
          <p className="text-gray-500 text-sm">You&apos;ve already confirmed your details. Check your email for a sign-in link to access your tenant portal.</p>
        </div>
      </div>
    )
  }

  if (submitState === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-gray-900 font-bold text-xl mb-2">Check your email</h1>
          <p className="text-gray-500 text-sm">We&apos;ve sent a sign-in link to <strong>{tenant?.email}</strong>. Click it to access your tenant portal.</p>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  if (!tenant) return null
  const propertyAddress = [tenant.property.line1, tenant.property.line2, tenant.property.city, tenant.property.postcode].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-[#f0f7f4] flex items-start justify-center p-4 pt-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-[#0f1a0f] font-bold text-xl tracking-tight">LetSorted</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-gray-900 font-bold text-xl mb-1">Confirm your details</h1>
          <p className="text-gray-500 text-sm mb-5">
            Your landlord uses LetSorted for the property at <span className="font-medium text-gray-700">{propertyAddress}</span>.
            Please confirm your details to access your tenant portal.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <Label htmlFor="name">Full name</Label>
              <input
                id="name"
                {...register('name')}
                className={inputClass}
                placeholder="Your full name"
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div>
              <Label htmlFor="email">Email address</Label>
              <input
                id="email"
                type="email"
                value={tenant.email}
                readOnly
                className={inputReadOnlyClass}
              />
              <p className="mt-1 text-xs text-gray-400">This is your login — it cannot be changed here</p>
            </div>

            <div>
              <Label htmlFor="phone">Phone number <span className="text-gray-400 font-normal">(optional)</span></Label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className={inputClass}
                placeholder="07700 900000"
              />
            </div>

            {/* Property shown read-only */}
            <div className="bg-green-50 rounded-lg px-3.5 py-2.5">
              <p className="text-xs text-green-700 font-medium mb-0.5">Property</p>
              <p className="text-sm text-green-900">{propertyAddress}</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('confirmed')}
                className="mt-0.5 w-4 h-4 accent-green-600"
              />
              <span className="text-sm text-gray-600">These details are correct and I want to access my tenant portal</span>
            </label>
            {errors.confirmed && <p className="text-xs text-red-500">{errors.confirmed.message as string}</p>}

            {submitState === 'error' && (
              <p className="text-sm text-red-500">Something went wrong — please try again</p>
            )}

            <button
              type="submit"
              disabled={submitState === 'submitting'}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {submitState === 'submitting' ? 'Confirming…' : 'Confirm & get sign-in link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
