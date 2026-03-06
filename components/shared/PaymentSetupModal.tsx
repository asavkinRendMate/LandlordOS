'use client'

import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  context?: string
}

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-[#1A1A1A] placeholder-gray-400 text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors'

function detectBrand(number: string): string {
  const cleaned = number.replace(/\s/g, '')
  if (cleaned.startsWith('4')) return 'Visa'
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'Mastercard'
  if (/^3[47]/.test(cleaned)) return 'Amex'
  return 'Card'
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

// TODO: Replace this entire form with Stripe's PaymentElement when integrating real payments.
// The PaymentElement handles PCI compliance, card validation, and 3D Secure automatically.

export default function PaymentSetupModal({ isOpen, onClose, onSuccess, context }: Props) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const digits = cardNumber.replace(/\s/g, '')
    if (digits.length < 13) { setError('Enter a valid card number'); return }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) { setError('Enter expiry as MM/YY'); return }
    if (cvc.length < 3) { setError('Enter a valid CVC'); return }
    if (name.trim().length < 2) { setError('Enter cardholder name'); return }

    const last4 = digits.slice(-4)
    const brand = detectBrand(digits)

    setSaving(true)
    try {
      const res = await fetch('/api/payment/save-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last4, brand, expiry, name: name.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to save card')
        return
      }
      onSuccess()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setCardNumber('')
    setExpiry('')
    setCvc('')
    setName('')
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {context && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{context}</p>
          )}

          <div>
            <label className="block text-sm text-[#374151] mb-1.5">Card number</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#374151] mb-1.5">Expiry</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-[#374151] mb-1.5">CVC</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#374151] mb-1.5">Cardholder name</label>
            <input
              type="text"
              autoComplete="cc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="J Smith"
              className={inputClass}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {saving ? 'Saving...' : 'Save card'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Your card details are stored securely. You can remove your card at any time from Settings.
          </p>
        </form>
      </div>
    </div>
  )
}
