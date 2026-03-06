'use client'

import { useState } from 'react'

// TODO: replace email capture with Stripe payment flow when Financial Passport launches

export default function FinancialPassportPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setState('submitting')
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setState(res.ok ? 'done' : 'error')
  }

  return (
    <div className="min-h-screen bg-[#f0f7f4] py-12 px-4">
      <div className="max-w-xl mx-auto">

        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-[#0f1a0f] font-bold text-xl tracking-tight">LetSorted</span>
        </div>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Coming soon
          </div>
          <h1 className="text-[#0f1a0f] font-bold text-3xl sm:text-4xl mb-3 leading-tight">
            Your Financial Passport
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-md mx-auto">
            Stand out as a trusted tenant. Get an AI-powered analysis of your finances
            and share it with any landlord.
          </p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <ul className="space-y-3">
            {[
              { icon: '🤖', text: 'AI analysis of your bank statement' },
              { icon: '📊', text: 'Score out of 100 with detailed breakdown' },
              { icon: '📄', text: 'PDF report with QR verification code' },
              { icon: '🔗', text: 'Share with any landlord — even if they don\'t use LetSorted' },
              { icon: '✅', text: 'Valid for 90 days' },
            ].map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <span className="text-gray-700 text-sm">{f.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold text-[#0f1a0f]">From £4.00</span>
              <span className="text-gray-400 text-sm ml-1">per check</span>
            </div>
            <span className="text-xs text-gray-400">Instant report</span>
          </div>
        </div>

        {/* Waitlist form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {state === 'done' ? (
            <div className="text-center py-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 mb-1">You&apos;re on the list!</p>
              <p className="text-gray-500 text-sm">We&apos;ll email you as soon as Financial Passport launches.</p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900 mb-1">Get notified when we launch</h2>
              <p className="text-gray-400 text-sm mb-4">
                We&apos;re launching Financial Passport soon. Enter your email to be notified.
              </p>
              <form onSubmit={onSubmit} className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors"
                />
                <button
                  type="submit"
                  disabled={state === 'submitting'}
                  className="shrink-0 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  {state === 'submitting' ? '…' : 'Notify me'}
                </button>
              </form>
              {state === 'error' && (
                <p className="text-xs text-red-500 mt-2">Something went wrong — please try again</p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
