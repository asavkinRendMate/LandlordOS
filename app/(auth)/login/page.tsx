'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Footer from '@/components/shared/Footer'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('[login] signInWithOtp error:', error.code, error.message, error.status)
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F7F8F6] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-0">
          <Image src="/logo.svg" alt="LetSorted" width={160} height={53} priority />
        </div>

        {sent ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 bg-[#16a34a]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-gray-900 font-semibold text-lg mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              We&apos;ve sent a magic link to <span className="text-gray-700 font-medium">{email}</span>.
              Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-6 text-sm text-[#16a34a] hover:text-[#15803d] transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h1 className="text-gray-900 font-semibold text-xl mb-1">Sign in</h1>
            <p className="text-gray-500 text-sm mb-6">Enter your email to receive a magic link.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-gray-600 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/30 transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              New to LetSorted?{' '}
              <a href="https://letsorted.co.uk" className="text-[#16a34a]/70 hover:text-[#16a34a] transition-colors">
                Learn more
              </a>
            </p>
          </div>
        )}
      </div>
      </div>
      <Footer variant="app" />
    </div>
  )
}
