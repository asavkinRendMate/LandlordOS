'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Modal, Spinner } from '@/lib/ui'
import { buttonClass, buttonSecondaryClass } from '@/lib/form-styles'
import type { StandalonePackage } from '@/lib/screening-pricing'
import DemoUpsell from '@/components/shared/DemoUpsell'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface PackPurchaseModalProps {
  pack: StandalonePackage
  hasSavedCard: boolean
  savedCardLast4?: string
  savedCardBrand?: string
  isDemo?: boolean
  onSuccess: (creditsAdded: number) => void
  onClose: () => void
}

// ── Saved card flow (confirm-only) ──────────────────────────────────────────

function SavedCardConfirm({
  pack,
  cardLast4,
  cardBrand,
  onSuccess,
  onClose,
}: {
  pack: StandalonePackage
  cardLast4?: string
  cardBrand?: string
  onSuccess: (creditsAdded: number) => void
  onClose: () => void
}) {
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    setPaying(true)
    setError(null)
    try {
      const res = await fetch('/api/payment/purchase-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageType: pack.type }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Payment failed')
        setPaying(false)
        return
      }

      if (json.data?.status === 'succeeded') {
        onSuccess(json.data.credits)
      } else {
        setError('Unexpected response — please try again')
        setPaying(false)
      }
    } catch {
      setError('Something went wrong')
      setPaying(false)
    }
  }

  const brandLabel = cardBrand
    ? cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)
    : 'Card'

  return (
    <div className="p-5 space-y-5">
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500 mb-1">
          {pack.credits} check{pack.credits !== 1 ? 's' : ''}
        </p>
        <p className="text-2xl font-bold text-gray-900">{pack.priceDisplay}</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <span>
          Charged to: {brandLabel} ending {cardLast4}
        </span>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onClose} className={`${buttonSecondaryClass} flex-1`} disabled={paying}>
          Cancel
        </button>
        <button onClick={handlePay} className={`${buttonClass} flex-1`} disabled={paying}>
          {paying ? <Spinner size="sm" color="white" /> : `Pay ${pack.priceDisplay}`}
        </button>
      </div>
    </div>
  )
}

// ── New card flow (Payment Element) ─────────────────────────────────────────

function NewCardForm({
  pack,
  onSuccess,
}: {
  pack: StandalonePackage
  onSuccess: (creditsAdded: number) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setPaying(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed')
      setPaying(false)
      return
    }

    // Poll for webhook fulfilment (up to 8s)
    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 500))
      try {
        const res = await fetch('/api/screening/credits')
        const json = await res.json()
        if (json.data?.remainingCredits > 0) {
          onSuccess(pack.credits)
          return
        }
      } catch {
        // ignore — keep polling
      }
    }

    // If polling didn't confirm, still show success since payment went through
    onSuccess(pack.credits)
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500 mb-1">
          {pack.credits} check{pack.credits !== 1 ? 's' : ''}
        </p>
        <p className="text-2xl font-bold text-gray-900">{pack.priceDisplay}</p>
      </div>

      <PaymentElement />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={paying || !stripe || !elements}
        className={`${buttonClass} w-full`}
      >
        {paying ? <Spinner size="sm" color="white" /> : `Pay ${pack.priceDisplay}`}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Your card details are stored securely by Stripe for future purchases.
      </p>
    </form>
  )
}

// ── Main modal ──────────────────────────────────────────────────────────────

export default function PackPurchaseModal({
  pack,
  hasSavedCard,
  savedCardLast4,
  savedCardBrand,
  isDemo,
  onSuccess,
  onClose,
}: PackPurchaseModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    if (isDemo || hasSavedCard) return // Demo users and saved card flow don't need a clientSecret
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/payment/purchase-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageType: pack.type }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to initialise payment')
        return
      }
      if (json.data?.clientSecret) {
        setClientSecret(json.data.clientSecret)
      } else {
        setError('Unexpected response')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [isDemo, hasSavedCard, pack.type])

  useEffect(() => {
    fetchClientSecret()
  }, [fetchClientSecret])

  return (
    <Modal isOpen onClose={onClose} title="Buy screening credits">
      {isDemo ? (
        <div className="p-5">
          <DemoUpsell />
        </div>
      ) : hasSavedCard ? (
        <SavedCardConfirm
          pack={pack}
          cardLast4={savedCardLast4}
          cardBrand={savedCardBrand}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      ) : (
        <>
          {loading && (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          )}

          {error && !loading && (
            <div className="p-5 space-y-3">
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={fetchClientSecret}
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
              <NewCardForm pack={pack} onSuccess={onSuccess} />
            </Elements>
          )}

          {!stripePromise && !loading && (
            <div className="p-5">
              <p className="text-red-500 text-sm">
                Payment setup is not available. Please contact support.
              </p>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
