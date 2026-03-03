'use client'

import { useState, useEffect } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const painPoints = [
  {
    icon: '🚫',
    title: 'Section 21 abolished',
    body: 'No-fault evictions are gone. All repossessions now require specified grounds under Section 8 — you need to know them.',
  },
  {
    icon: '💷',
    title: 'Fines up to £40,000',
    body: 'Local authorities have new civil penalty powers. Non-compliance with the new rules can cost up to £40,000 per offence.',
  },
  {
    icon: '📋',
    title: 'PRS Database registration',
    body: "Every landlord must register on the new Privately Rented Sector database. Failure to register is a criminal offence.",
  },
  {
    icon: '💧',
    title: "Awaab's Law extended",
    body: 'Damp and mould hazards must be investigated within 24 hours and remedied promptly. This applies to all private rentals.',
  },
]

const featureGroups = [
  {
    icon: '🛡️',
    title: 'Compliance autopilot',
    features: [
      'Gas Safety Certificate tracker with annual renewal alerts',
      'EPC rating monitor — warns before expiry',
      'EICR tracker with 5-year cycle reminders',
      'Deposit registration deadline alert (30 days from move-in)',
      'PRS Database registration reminders',
    ],
  },
  {
    icon: '🔍',
    title: 'Tenant pipeline',
    features: [
      'Unique shareable application link per property',
      'AI document screening — payslips, bank statements, references',
      'Right to Rent check tracker',
      'Shortlisting and applicant comparison',
    ],
  },
  {
    icon: '✍️',
    title: 'Move-in made easy',
    features: [
      'APT (Assured Periodic Tenancy) contract generator',
      'Digital inventory report with photo uploads',
      'Tenant e-sign and document storage',
      'Move-in checklist for landlord and tenant',
    ],
  },
  {
    icon: '🏡',
    title: 'Active tenancy',
    features: [
      'Rent payment tracker with arrears alerts',
      'Tenant portal for payments, docs, and messages',
      "Maintenance ticket system with Awaab's Law 24-hour timer",
      'Section 13 rent increase notice — enforced once per year',
    ],
  },
  {
    icon: '⚖️',
    title: 'When things go wrong',
    features: [
      'Section 8 Notice generator with correct statutory grounds',
      'Dispute evidence pack compilation',
      'Full repair log for tribunal evidence',
    ],
  },
]

const freeFeatures = [
  'Full compliance tracking',
  'Maintenance ticket system',
  'Tenant portal',
  'Rent payment tracker',
  'All compliance alerts',
]

const proFeatures = [
  'Everything in Free',
  'Unlimited properties',
  'Priority support',
  'Bulk certificate import',
  'Portfolio-level dashboard',
]

const oneOffItems = [
  { name: 'Screening Pack', price: '£15', desc: 'Full AI applicant report' },
  { name: 'APT Contract', price: '£10', desc: 'Legally-reviewed template' },
  { name: 'Inventory Report', price: '£5', desc: 'AI-assisted condition report' },
  { name: 'Dispute Pack', price: '£29', desc: 'Evidence bundle for disputes' },
]

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [properties, setProperties] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Scroll reveal — native IntersectionObserver, no libraries
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !properties) {
      setFormError('Please fill in both fields.')
      return
    }
    setFormError('')
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, propertyCount: properties }),
      })
      const data = (await res.json()) as {
        success?: boolean
        alreadyRegistered?: boolean
        error?: string
      }
      if (!res.ok || !data.success) {
        setFormError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      if (data.alreadyRegistered) setAlreadyRegistered(true)
      setSubmitted(true)
    } catch {
      setFormError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .hero-0 { animation: fadeInUp 0.65s ease both; }
        .hero-1 { animation: fadeInUp 0.65s ease 0.12s both; }
        .hero-2 { animation: fadeInUp 0.65s ease 0.24s both; }
        .hero-3 { animation: fadeInUp 0.65s ease 0.38s both; }

        .reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .reveal.is-revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-xl text-gray-900 select-none">
            <span className="text-2xl leading-none">🏠</span>
            LandlordOS
          </div>
          <a
            href="#waitlist"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
          >
            Join waitlist
          </a>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-6 bg-gradient-to-b from-green-50 via-green-50/40 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="hero-0 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 font-medium text-sm px-4 py-1.5 rounded-full mb-8">
            <IconWarning />
            Renters&apos; Rights Act — live 1 May 2026
          </div>

          <h1 className="hero-1 text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
            Landlord law just changed.
            <br />
            <span className="text-green-600">Stay on the right side of it.</span>
          </h1>

          <p className="hero-2 text-xl text-gray-500 leading-relaxed mb-3 max-w-2xl mx-auto">
            The Renters&apos; Rights Act 2025 is the biggest shake-up to UK rental law in a generation.
            Non-compliant landlords face fines up to{' '}
            <span className="font-semibold text-gray-700">£40,000</span>.
          </p>
          <p className="hero-2 text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            LandlordOS tracks your certificates, manages your tenancies, and keeps you compliant —
            automatically.
          </p>

          <div className="hero-3">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors duration-150 shadow-lg shadow-green-200/60"
            >
              Join the waitlist — it&apos;s free
              <IconArrowRight />
            </a>
          </div>
        </div>
      </section>

      {/* ── Pain section ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              What changed on 1 May 2026
            </h2>
            <p className="text-gray-400 text-lg">
              The key things self-managing landlords need to know.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {painPoints.map((point, i) => (
              <div
                key={point.title}
                className="reveal border border-gray-100 rounded-2xl p-7 hover:border-green-200 hover:shadow-sm transition-all duration-200"
                style={{ transitionDelay: `${i * 0.07}s` }}
              >
                <div className="text-3xl mb-4">{point.icon}</div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{point.title}</h3>
                <p className="text-gray-500 leading-relaxed text-[15px]">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features section ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Everything you need in one place
            </h2>
            <p className="text-gray-400 text-lg">
              No spreadsheets. No missed deadlines. No nasty surprises.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureGroups.map((group, i) => (
              <div
                key={group.title}
                className="reveal bg-white rounded-2xl p-7 border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all duration-200"
                style={{ transitionDelay: `${i * 0.07}s` }}
              >
                <div className="text-3xl mb-4">{group.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-4">{group.title}</h3>
                <ul className="space-y-2.5">
                  {group.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-gray-500 text-sm leading-snug">
                      <IconCheck className="text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing section ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Simple, honest pricing
            </h2>
            <p className="text-gray-400 text-lg">Start free. Pay only when you grow.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            {/* Free tier */}
            <div className="reveal rounded-2xl border-2 border-gray-200 p-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Free</p>
              <p className="text-5xl font-extrabold text-gray-900">£0</p>
              <p className="text-gray-400 text-sm mt-1 mb-7">forever · 1 property</p>
              <ul className="space-y-3">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-gray-600 text-sm">
                    <IconCheck className="text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro tier */}
            <div className="reveal rounded-2xl border-2 border-green-500 p-8 relative">
              <span className="absolute -top-3.5 right-6 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Most popular
              </span>
              <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">Pro</p>
              <p className="text-5xl font-extrabold text-gray-900">£10</p>
              <p className="text-gray-400 text-sm mt-1 mb-7">per property / month · 2+ properties</p>
              <ul className="space-y-3">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-gray-600 text-sm">
                    <IconCheck className="text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* One-off items */}
          <div className="reveal bg-gray-50 rounded-2xl p-7">
            <p className="font-bold text-gray-900 mb-5">Pay-as-you-go extras</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {oneOffItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between bg-white rounded-xl px-5 py-4 border border-gray-100"
                >
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                  <p className="font-bold text-green-600 text-lg">{item.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Waitlist section ──────────────────────────────────────────────── */}
      <section id="waitlist" className="py-24 px-6 bg-green-50">
        <div className="max-w-md mx-auto text-center">
          {submitted ? (
            <div>
              <p className="text-6xl mb-6">{alreadyRegistered ? '👋' : '🎉'}</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {alreadyRegistered ? "You're already on the list!" : "You're on the list!"}
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed">
                We&apos;ll be in touch before 1 May 2026. Know another landlord who&apos;d benefit? Tell
                them about LandlordOS.
              </p>
            </div>
          ) : (
            <>
              <div className="reveal mb-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                  Get early access
                </h2>
                <p className="text-gray-500 text-lg leading-relaxed">
                  Be ready before the Act comes into force. Join the waitlist and we&apos;ll let you
                  know when LandlordOS opens.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="reveal space-y-3.5 text-left">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
                  required
                />

                <div className="relative">
                  <select
                    value={properties}
                    onChange={(e) => setProperties(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3.5 pr-11 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base appearance-none"
                    required
                  >
                    <option value="" disabled>
                      How many properties do you manage?
                    </option>
                    <option value="1">1 property</option>
                    <option value="2-3">2–3 properties</option>
                    <option value="4-10">4–10 properties</option>
                    <option value="10+">10+ properties</option>
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <IconChevronDown />
                  </div>
                </div>

                {formError && <p className="text-red-500 text-sm">{formError}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base transition-colors duration-150 shadow-lg shadow-green-200/60"
                >
                  {loading ? 'Joining…' : "Join the waitlist — it's free"}
                </button>

                <p className="text-center text-gray-400 text-xs pt-1">
                  No spam. No passwords. Unsubscribe any time.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-gray-400 text-sm">
          <div className="flex items-center gap-2 font-semibold text-gray-600">
            <span>🏠</span>
            LandlordOS
          </div>
          <span>LandlordOS © 2026</span>
        </div>
      </footer>
    </>
  )
}
