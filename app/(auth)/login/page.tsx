'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { sendOtpDirect } from '@/lib/supabase/otp'
import Footer from '@/components/shared/Footer'

// Demo credentials — inlined at build time, empty string if unset
const demoLandlordEmail = process.env.NEXT_PUBLIC_DEMO_LANDLORD_EMAIL ?? ''
const demoLandlordPassword = process.env.NEXT_PUBLIC_DEMO_LANDLORD_PASSWORD ?? ''
const demoTenantEmail = process.env.NEXT_PUBLIC_DEMO_TENANT_EMAIL ?? ''
const demoTenantPassword = process.env.NEXT_PUBLIC_DEMO_TENANT_PASSWORD ?? ''
const showDemo = demoLandlordEmail.length > 0 && demoLandlordPassword.length > 0
  && demoTenantEmail.length > 0 && demoTenantPassword.length > 0

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const returnTo = nextParam?.startsWith('/') ? nextParam : '/dashboard'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Demo login
  const [demoLoading, setDemoLoading] = useState<'landlord' | 'tenant' | null>(null)
  const [demoError, setDemoError] = useState<string | null>(null)

  // OTP code input
  const [code, setCode] = useState(['', '', '', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-focus first input when code screen appears
  useEffect(() => {
    if (sent) {
      inputRefs.current[0]?.focus()
    }
  }, [sent])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await sendOtpDirect(email)

    if (error) {
      console.error('[login] sendOtp error:', error)
      setError(error)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  async function handleVerify(otpCode: string) {
    setVerifying(true)
    setError(null)

    const supabase = createClient()

    // Try type 'email' first (current docs), fall back to 'magiclink' (legacy)
    let result = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    })

    if (result.error) {
      console.error('[login] verifyOtp (type=email) error:', result.error.code, result.error.message, result.error.status)
      result = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'magiclink',
      })
    }

    if (result.error) {
      console.error('[login] verifyOtp (type=magiclink) error:', result.error.code, result.error.message, result.error.status)
      setError(`Code verification failed: ${result.error.message}`)
      setCode(['', '', '', '', '', '', '', ''])
      setVerifying(false)
      inputRefs.current[0]?.focus()
    } else {
      // Keep verifying=true so the spinner stays visible until navigation completes
      window.location.href = returnTo
    }
  }

  function handleCodeChange(index: number, value: string) {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-advance to next input
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 8 digits entered
    if (value && index === 7) {
      const fullCode = newCode.join('')
      if (fullCode.length === 8) {
        handleVerify(fullCode)
      }
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8)
    if (!pasted) return

    const newCode = [...code]
    for (let i = 0; i < 8; i++) {
      newCode[i] = pasted[i] || ''
    }
    setCode(newCode)

    if (pasted.length === 8) {
      handleVerify(pasted)
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }

  async function handleResend() {
    setLoading(true)
    setError(null)

    const { error } = await sendOtpDirect(email)

    if (error) {
      setError(error)
    } else {
      setError(null)
      setCode(['', '', '', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
    setLoading(false)
  }

  async function handleDemoLogin(role: 'landlord' | 'tenant') {
    setDemoLoading(role)
    setDemoError(null)

    const demoEmail = role === 'landlord' ? demoLandlordEmail : demoTenantEmail
    const demoPassword = role === 'landlord' ? demoLandlordPassword : demoTenantPassword

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    })

    if (error) {
      console.error(`[login] demo ${role} error:`, error.message)
      setDemoError('Demo unavailable — please try again')
      setDemoLoading(null)
    } else {
      window.location.href = role === 'landlord' ? '/dashboard' : '/tenant/dashboard'
    }
  }

  return (
    <div className="h-dvh bg-[#F7F8F6] flex flex-col overflow-y-auto">
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-0">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image src="/logo.svg" alt="LetSorted" width={160} height={53} priority />
        </div>

        {sent ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm relative overflow-hidden">
            {verifying ? (
              /* ── Verifying overlay ──────────────────────────────────── */
              <div className="py-4">
                <div className="w-12 h-12 mx-auto mb-5 relative">
                  <svg className="w-12 h-12 animate-spin text-[#16a34a]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <h2 className="text-gray-900 font-semibold text-lg mb-1">Signing you in</h2>
                <p className="text-gray-500 text-sm">Verifying your code…</p>
                <div className="mt-5 mx-auto w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#16a34a] rounded-full animate-progress" />
                </div>
              </div>
            ) : (
              /* ── Code entry ─────────────────────────────────────────── */
              <>
                <div className="w-12 h-12 bg-[#16a34a]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-gray-900 font-semibold text-lg mb-1">Enter your sign-in code</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We sent an 8-digit code to<br />
                  <span className="text-gray-700 font-medium">{email}</span>
                </p>

                {/* 8-digit OTP input */}
                <div className="flex justify-center gap-1.5 mt-6" onPaste={handleCodePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-9 h-12 text-center text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/30 transition-colors"
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-red-600 text-sm mt-3">{error}</p>
                )}

                <div className="mt-6 space-y-2">
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="text-sm text-[#16a34a] hover:text-[#15803d] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sending…' : 'Resend code'}
                  </button>
                  <div>
                    <button
                      onClick={() => { setSent(false); setEmail(''); setCode(['', '', '', '', '', '', '', '']); setError(null) }}
                      className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h1 className="text-gray-900 font-semibold text-xl mb-1">Sign in</h1>
            <p className="text-gray-500 text-sm mb-4 sm:mb-6">Enter your email to receive a sign-in code.</p>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>

            {showDemo && (
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or try a demo</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('landlord')}
                    disabled={demoLoading !== null}
                    className="flex items-center justify-center gap-1.5 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {demoLoading === 'landlord' ? (
                      <svg className="w-4 h-4 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <span>🏠</span>
                    )}
                    Landlord demo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('tenant')}
                    disabled={demoLoading !== null}
                    className="flex items-center justify-center gap-1.5 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {demoLoading === 'tenant' ? (
                      <svg className="w-4 h-4 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <span>👤</span>
                    )}
                    Tenant demo
                  </button>
                </div>
                {demoError && (
                  <p className="text-gray-400 text-xs text-center mt-2">{demoError}</p>
                )}
              </div>
            )}

            <p className="mt-4 sm:mt-6 text-center text-xs text-gray-400">
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
