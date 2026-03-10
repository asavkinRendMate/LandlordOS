'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  context?: string
}

function SetupForm({ onSuccess, context }: { onSuccess: () => void; context?: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setSaving(true)
    setError(null)

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })

    if (submitError) {
      setError(submitError.message ?? 'Something went wrong')
      setSaving(false)
      return
    }

    // SetupIntent succeeded — webhook will save card details to DB.
    // Brief delay to let webhook process before UI refreshes.
    await new Promise((r) => setTimeout(r, 1500))
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {context && (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{context}</p>
      )}

      <PaymentElement />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={saving || !stripe || !elements}
        className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
      >
        {saving ? 'Saving...' : 'Save card'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Your card details are stored securely by Stripe. You can remove your card at any time from Settings.
      </p>
    </form>
  )
}

export default function PaymentSetupModal({ isOpen, onClose, onSuccess, context }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSetupIntent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/payment/setup-intent', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to initialise payment setup')
        return
      }
      setClientSecret(json.data.clientSecret)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && !clientSecret) {
      fetchSetupIntent()
    }
  }, [isOpen, clientSecret, fetchSetupIntent])

  if (!isOpen) return null

  function handleClose() {
    setClientSecret(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[#1A1A1A] font-semibold">Add payment method</h2>
          <button onClick={handleClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="p-5 space-y-3">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={fetchSetupIntent}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {clientSecret && stripePromise && !loading && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#16a34a',
                  borderRadius: '8px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                },
              },
            }}
          >
            <SetupForm onSuccess={onSuccess} context={context} />
          </Elements>
        )}

        {!stripePromise && !loading && (
          <div className="p-5">
            <p className="text-red-500 text-sm">
              Payment setup is not available. Please contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
