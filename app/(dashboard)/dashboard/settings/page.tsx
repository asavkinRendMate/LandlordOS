'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PaymentSetupModal from '@/components/shared/PaymentSetupModal'
import { showErrorToast } from '@/lib/error-toast'

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors'

interface CardInfo {
  last4: string
  brand: string
  expiry: string
}

interface SubscriptionInfo {
  status: string
  propertyCount: number
  monthlyAmount: number
  currentPeriodEnd: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Billing state
  const [card, setCard] = useState<CardInfo | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [billingLoading, setBillingLoading] = useState(true)
  const [billingAction, setBillingAction] = useState(false)

  const fetchBilling = useCallback(() => {
    setBillingLoading(true)
    fetch('/api/payment/subscription')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          setCard(json.data.card ?? null)
          setSubscription(json.data.subscription ?? null)
        }
      })
      .catch(console.error)
      .finally(() => setBillingLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => {
        if (res.status === 401) { router.push('/login'); return null }
        return res.json()
      })
      .then((json) => {
        if (json?.data) {
          setName(json.data.name ?? '')
          setEmail(json.data.email ?? '')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    fetchBilling()
  }, [router, fetchBilling])

  async function handleRemoveCard() {
    setBillingAction(true)
    try {
      await fetch('/api/payment/remove-card', { method: 'POST' })
      fetchBilling()
    } catch { /* silent */ } finally { setBillingAction(false) }
  }

  async function handleCancelSubscription() {
    setBillingAction(true)
    try {
      await fetch('/api/payment/subscription/cancel', { method: 'POST' })
      fetchBilling()
    } catch { /* silent */ } finally { setBillingAction(false) }
  }

  async function handleResubscribe() {
    setBillingAction(true)
    try {
      await fetch('/api/payment/subscription/update', { method: 'POST' })
      fetchBilling()
    } catch { /* silent */ } finally { setBillingAction(false) }
  }

  async function handleManageSubscription() {
    setBillingAction(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json()
      if (json.data?.url) {
        window.location.href = json.data.url
      }
    } catch { /* silent */ } finally { setBillingAction(false) }
  }

  async function handleSave() {
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Something went wrong')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Something went wrong')
      // TODO: wire showErrorToast() to remaining API calls
      showErrorToast({ context: 'saving profile' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-[#1A1A1A] text-xl font-semibold mb-6">Settings</h1>

      <div className="max-w-lg space-y-6">
        <div className="bg-white border border-black/[0.06] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)]">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Profile</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Johnson or Riverside Properties"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">Shown to tenants and candidates in emails from LetSorted.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-500 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email is managed through your login. Contact support to change it.</p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              {saved && <span className="text-green-600 text-sm font-medium">Saved</span>}
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="bg-white border border-black/[0.06] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)]">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Billing</h2>

          {billingLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Payment method */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payment method</p>
                {card ? (
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-5 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-600">{card.brand.slice(0, 4).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 font-medium">
                          {card.brand} ending in {card.last4}
                        </p>
                        <p className="text-xs text-gray-500">Expires {card.expiry}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCard}
                      disabled={billingAction}
                      className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                  >
                    + Add payment method
                  </button>
                )}
              </div>

              {/* Subscription */}
              {subscription && subscription.status !== 'NONE' ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Subscription</p>

                  {subscription.status === 'PAST_DUE' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <p className="text-red-700 text-sm font-medium">Payment past due</p>
                      <p className="text-red-600 text-xs mt-0.5">Please update your payment method to avoid service interruption.</p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {subscription.propertyCount} {subscription.propertyCount === 1 ? 'property' : 'properties'}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        subscription.status === 'PAST_DUE' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {subscription.status === 'ACTIVE' ? 'Active' :
                         subscription.status === 'PAST_DUE' ? 'Past due' :
                         'Cancelled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">
                      £{(subscription.monthlyAmount / 100).toFixed(2)}/mo
                    </p>
                    {subscription.currentPeriodEnd && (
                      <p className="text-xs text-gray-500">
                        {subscription.status === 'CANCELLED' ? 'Ends' : 'Renews'}{' '}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={handleManageSubscription}
                      disabled={billingAction}
                      className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
                    >
                      Manage subscription
                    </button>
                    {subscription.status === 'ACTIVE' ? (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={billingAction}
                        className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                      >
                        Cancel subscription
                      </button>
                    ) : subscription.status === 'CANCELLED' ? (
                      <button
                        onClick={handleResubscribe}
                        disabled={billingAction}
                        className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
                      >
                        Resubscribe
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400">
                    Your first property is always free. Additional properties are £9.99/mo each.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <PaymentSetupModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => { setShowPaymentModal(false); fetchBilling() }}
      />
    </div>
  )
}
