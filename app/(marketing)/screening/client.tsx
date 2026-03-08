'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── FAQ Data ──────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: 'What does the candidate need to do?',
    a: 'They click the link in their email, upload PDF bank statements (most banks let you download these in seconds), and get their score within 2 minutes.',
  },
  {
    q: 'How long does a screening take?',
    a: 'Usually 1–2 minutes. Our AI reads the bank statements, verifies names, checks income, spending patterns, and risk indicators — then gives you a scored report.',
  },
  {
    q: 'What does the report include?',
    a: 'A financial score (0–100) with a grade, plus a full breakdown across 6 categories: affordability, income stability, liquidity, debt levels, gambling activity, and positive indicators like savings habits.',
  },
  {
    q: 'Do I need a LetSorted account?',
    a: 'Yes — you\'ll need to sign in with your email (one-time code, no passwords) to send invites and view reports.',
  },
  {
    q: 'Can the candidate verify the report?',
    a: 'Every report has a unique verification link the candidate can share with other landlords or agents. It proves the report is genuine and unaltered.',
  },
  {
    q: 'How much does it cost?',
    a: 'During beta, sending invites is free. You only pay £9.99 to unlock the full report once the candidate has completed their check.',
  },
]

const howItWorks = [
  {
    step: '1',
    title: 'Send an invite',
    desc: 'Enter the candidate\'s name, email, property address, and rent. They get a link to complete the check.',
  },
  {
    step: '2',
    title: 'Candidate uploads statements',
    desc: 'Your candidate uploads their PDF bank statements directly. You never handle their sensitive documents.',
  },
  {
    step: '3',
    title: 'You get the report',
    desc: 'AI analyses income, spending, and risk indicators. Unlock the full report to see the detailed breakdown.',
  },
]

const sampleCategories = [
  { label: 'Affordability', score: '+30', colour: 'text-green-600' },
  { label: 'Income Stability', score: '+20', colour: 'text-green-600' },
  { label: 'Liquidity', score: '+15', colour: 'text-green-600' },
  { label: 'Debt', score: '-10', colour: 'text-red-500' },
  { label: 'Gambling', score: '0', colour: 'text-gray-400' },
  { label: 'Positive Signals', score: '+25', colour: 'text-green-600' },
]

// ─── Icons ──────────────────────────────────────────────────────────────────────

function IconChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Input classes ──────────────────────────────────────────────────────────────

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors'

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ScreeningPage() {
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Check auth state
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  // Form state
  const [senderName, setSenderName] = useState('')
  const [, setSenderNameLoaded] = useState(false)
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  // Restore pending invite from sessionStorage (after login redirect)
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('pendingInvite')
      if (pending) {
        const data = JSON.parse(pending)
        if (data.candidateName) setCandidateName(data.candidateName)
        if (data.candidateEmail) setCandidateEmail(data.candidateEmail)
        if (data.propertyAddress) setPropertyAddress(data.propertyAddress)
        if (data.monthlyRent) setMonthlyRent(data.monthlyRent)
        if (data.senderName) setSenderName(data.senderName)
        sessionStorage.removeItem('pendingInvite')
        setRestored(true)
        setTimeout(() => setRestored(false), 5000)
        // Scroll to the form after a tick so the DOM has updated
        setTimeout(() => {
          document.getElementById('invite-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    } catch {}
  }, [])

  // Pre-fill sender name from profile if logged in (only if not restored from pending)
  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.name) setSenderName((prev) => prev || json.data.name)
      })
      .catch(() => {})
      .finally(() => setSenderNameLoaded(true))
  }, [])

  async function handleSendInvite() {
    setError(null)
    if (!senderName.trim() || !candidateName.trim() || !candidateEmail.trim() || !propertyAddress.trim() || !monthlyRent) {
      setError('Please fill in all fields')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/screening/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName.trim(),
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim(),
          propertyAddress: propertyAddress.trim(),
          monthlyRent: Number(monthlyRent),
        }),
      })

      if (res.status === 401) {
        sessionStorage.setItem('pendingInvite', JSON.stringify({
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim(),
          propertyAddress: propertyAddress.trim(),
          monthlyRent,
          senderName: senderName.trim(),
        }))
        router.push(`/login?next=${encodeURIComponent('/screening')}`)
        return
      }

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        return
      }

      router.push(`/screening/sent?email=${encodeURIComponent(candidateEmail.trim())}&name=${encodeURIComponent(candidateName.trim())}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} priority />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 text-sm transition-colors"
            >
              Home
            </Link>
            {userEmail ? (
              <Link
                href="/screening/invites"
                className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 text-sm transition-colors"
              >
                My invites
              </Link>
            ) : null}
            {userEmail ? (
              <>
                <span className="text-gray-400 text-sm hidden sm:inline">{userEmail}</span>
                <button
                  onClick={async () => {
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    setUserEmail(null)
                    router.refresh()
                  }}
                  className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 text-sm transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent('/screening')}`}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-6 bg-gradient-to-b from-green-50 via-green-50/40 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-green-600 font-semibold text-sm mb-4 tracking-wide uppercase">
            Tenant Screening
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
            Send a financial check{' '}
            <span className="text-green-600">to your candidate.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            They upload their own bank statements. You get an AI-scored report in under 2 minutes.
            No handling sensitive documents. No waiting for reference agencies.
          </p>
          <a
            href="#invite-form"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-colors duration-150"
          >
            Send an invite
          </a>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Three steps to a decision
            </h2>
            <p className="text-gray-400 text-lg">No agents. No waiting. No guesswork.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {howItWorks.map((item) => (
              <div key={item.step} className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <span className="text-green-700 font-bold text-sm">{item.step}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Invite Form + Email Preview ───────────────────────────────────── */}
      <section id="invite-form" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Send an invite
            </h2>
            <p className="text-gray-400 text-lg">Your candidate gets an email with a link to complete the check.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. John Smith or Greenfield Properties"
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-400 mt-1">This is how your candidate will know who sent the invitation.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Candidate name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Full name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Candidate email</label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="candidate@email.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Property address</label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="e.g. 14 Rose Lane, London SE1 5QH"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly rent (£)</label>
                  <input
                    type="number"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    placeholder="e.g. 1200"
                    min="0"
                    step="1"
                    className={inputClass}
                  />
                </div>

                {restored && (
                  <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-lg px-3.5 py-3 text-sm text-green-700">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Your invite details are ready — just hit <strong>Send invite</strong> to continue.</span>
                  </div>
                )}

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <button
                  onClick={handleSendInvite}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
                >
                  {submitting ? 'Sending...' : 'Send invite'}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Free to send. You only pay £9.99 to unlock the report.
                </p>

                <p className="text-xs text-gray-400 text-center mt-2">
                  Have a question?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.$crisp) {
                        window.$crisp.push(['do', 'chat:open'])
                      }
                    }}
                    className="text-green-600 hover:text-green-700 font-medium underline underline-offset-2"
                  >
                    Chat with us — we&apos;re real people, not a bot.
                  </button>
                </p>
              </div>
            </div>

            {/* Email preview */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-400 font-medium">Email preview</p>
              </div>
              <div className="p-5">
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-0.5">To</p>
                  <p className="text-sm text-gray-700">{candidateEmail || 'candidate@email.com'}</p>
                </div>
                <div className="mb-5">
                  <p className="text-xs text-gray-400 mb-0.5">Subject</p>
                  <p className="text-sm text-gray-700 font-medium">You&apos;ve been invited to complete a financial check</p>
                </div>

                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <p className="text-gray-900 font-bold text-sm mb-0.5">LetSorted</p>
                  <p className="text-gray-400 text-xs mb-4">Financial Screening</p>
                  <p className="text-gray-700 text-sm mb-3">
                    Hi {candidateName || 'candidate'},
                  </p>
                  <p className="text-gray-600 text-sm mb-3">
                    You&apos;ve been invited to complete a financial check for:
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                    <p className="text-green-700 text-sm font-semibold">
                      {propertyAddress || '14 Rose Lane, London SE1 5QH'}
                    </p>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Upload your bank statements and get a financial score in under 2 minutes.
                  </p>
                  <div className="inline-block bg-green-600 text-white font-semibold text-xs px-4 py-2 rounded-lg">
                    Start check
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sample report ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              What you get
            </h2>
            <p className="text-gray-400 text-lg">A detailed financial profile — not just a credit score.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-lg mx-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Sample Report</p>
                  <p className="font-bold text-gray-900 text-lg mt-0.5">Jane Smith</p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
                    <span className="font-bold text-lg">80</span>
                    <span className="text-xs font-medium">/ 100</span>
                  </div>
                  <p className="text-green-600 font-semibold text-sm mt-1">Good</p>
                </div>
              </div>
              <p className="text-gray-500 text-sm">
                Rent £1,200/mo &middot; Net income £2,800/mo &middot; Rent-to-income 43%
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-4">Score Breakdown</p>
              <div className="space-y-3">
                {sampleCategories.map((cat) => (
                  <div key={cat.label} className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm">{cat.label}</span>
                    <span className={`font-semibold text-sm ${cat.colour}`}>{cat.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="bg-gray-50 rounded-xl p-4 relative overflow-hidden">
                <p className="text-gray-400 text-sm blur-[3px] select-none">
                  Regular salary income detected from Acme Ltd. Consistent monthly deposits averaging £2,800.
                  No payday loans or gambling transactions found. Occasional BNPL usage below threshold.
                  Savings transfers detected monthly. Previous rent payments visible in statements.
                </p>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/60">
                  <p className="text-gray-600 font-semibold text-sm">Full AI summary included in report</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust section ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Built for UK landlords
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Candidates upload directly</h3>
              <p className="text-gray-500 text-sm">You never handle sensitive bank statements. Candidates upload their own documents securely.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Results in minutes</h3>
              <p className="text-gray-500 text-sm">No waiting days for a reference agency. Upload statements and get your report in under 2 minutes.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Verifiable reports</h3>
              <p className="text-gray-500 text-sm">Each report has a unique link. Tenants can share it with other landlords to prove their financial standing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Questions?
            </h2>
          </div>

          <div className="space-y-0 divide-y divide-gray-100">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left group"
                >
                  <span className="font-semibold text-gray-900 text-sm group-hover:text-green-600 transition-colors pr-4">
                    {faq.q}
                  </span>
                  <span className={`shrink-0 text-gray-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}>
                    <IconChevronDown />
                  </span>
                </button>
                {openFaq === i && (
                  <p className="text-gray-500 text-sm leading-relaxed pb-5 -mt-1">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-green-50">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to screen a candidate?
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            Send an invite and get a financial report in minutes.
          </p>
          <a
            href="#invite-form"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-colors duration-150"
          >
            Send an invite
          </a>
        </div>
      </section>
    </div>
  )
}
