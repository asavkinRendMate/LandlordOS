'use client'

import { useState, useEffect, Fragment } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const painPoints = [
  {
    icon: '📁',
    title: 'Documents everywhere',
    body: 'Certificates, contracts, inventories — scattered across email, Dropbox, and that pile on the desk. Finding anything when you need it is a mini-crisis.',
  },
  {
    icon: '💬',
    title: 'Chasing rent manually',
    body: "Texting tenants, checking your bank app every Friday, trying to remember if Dave paid last month. There has to be a better way.",
  },
  {
    icon: '⏰',
    title: 'No idea if certificates are expired',
    body: "Gas Safety, EPC, EICR — you know you have them somewhere. But when do they run out? You tend to find out when it's already a problem.",
  },
  {
    icon: '📱',
    title: 'Tenant requests lost in WhatsApp',
    body: "The boiler message is buried under 300 others. No paper trail, no follow-up, no idea what you agreed. And no defence if it goes further.",
  },
]

const howItWorks = [
  {
    icon: '🔍',
    title: 'Find the right tenant',
    body: 'Share one link in your Rightmove or OpenRent listing. Applicants upload their documents. You get an AI summary — income verified, affordability checked, red flags flagged.',
  },
  {
    icon: '📋',
    title: 'Move them in properly',
    body: "Generate a legally compliant tenancy agreement in minutes. Both parties sign online. Capture a timestamped photo inventory — your protection if there's ever a deposit dispute.",
  },
  {
    icon: '🏠',
    title: 'Manage without the chaos',
    body: 'Rent reminders go out automatically. Tenants submit maintenance requests through their own portal, with photos and a paper trail. You get alerts before certificates expire.',
  },
  {
    icon: '🛡️',
    title: 'Handle issues properly',
    body: "Need to raise the rent? We generate the correct notice. Things go wrong? Export a complete evidence pack — every message, photo and payment — in one click.",
  },
  {
    icon: '🔄',
    title: 'Start again, stress-free',
    body: 'Once the tenancy ends, your property is back to vacant in one click. Run the check-out inspection, handle the deposit, and open applications again.',
  },
]

const featureGroups = [
  {
    icon: '🏘️',
    title: 'Your properties at a glance',
    features: [
      'Dashboard overview across all your properties',
      'Status indicators — occupied, vacant, action needed',
      'Certificate expiry alerts before they become problems',
      'All your documents in one place, forever findable',
    ],
  },
  {
    icon: '🔍',
    title: 'Find and screen tenants',
    features: [
      'One shareable application link per property',
      'AI document screening — payslips, bank statements, references',
      'Right to Rent check tracker',
      'Side-by-side applicant comparison',
    ],
  },
  {
    icon: '✍️',
    title: 'Move-in without the paperwork',
    features: [
      'Tenancy agreement generator (legally up to date)',
      'Online signing for landlord and tenant',
      'Timestamped photo inventory report',
      'Deposit registration reminder (30-day deadline)',
    ],
  },
  {
    icon: '📬',
    title: 'Stay on top effortlessly',
    features: [
      'Automatic rent reminders and payment tracking',
      'Tenant portal for requests, messages and documents',
      'Maintenance ticket log with full history and photos',
      'Section 13 rent increase notice, done correctly',
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

function IconArrowRight({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
            LetSorted
          </div>
          <a
            href="#waitlist"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
          >
            Join the waitlist
          </a>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-6 bg-gradient-to-b from-green-50 via-green-50/40 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="hero-0 text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
            Your rentals,{' '}
            <span className="text-green-600">sorted.</span>
          </h1>

          <p className="hero-1 text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            LetSorted is the simplest way to manage your rental properties — tenants, documents,
            rent and compliance, all in one place.
          </p>

          <div className="hero-2">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors duration-150 shadow-lg shadow-green-200/60"
            >
              Join the waitlist — it&apos;s free
              <IconArrowRight />
            </a>
            <p className="mt-4 text-sm text-gray-400">
              New Renters&apos; Rights Act kicks in May 2026 — we&apos;ll have you ready.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pain section ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Sound familiar?
            </h2>
            <p className="text-gray-400 text-lg">
              Managing a rental property shouldn&apos;t feel like this.
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

      {/* ── How It Works section ──────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              From empty property to happy tenant — and everything in between
            </h2>
            <p className="text-gray-400 text-lg">
              LetSorted guides you through every stage of renting.
            </p>
          </div>

          {/* Desktop: horizontal flow with arrows */}
          <div className="hidden lg:flex items-start">
            {howItWorks.map((stage, i) => (
              <Fragment key={stage.title}>
                <div
                  className="reveal flex-1 bg-white rounded-2xl p-5 border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all duration-200"
                  style={{ transitionDelay: `${i * 0.07}s` }}
                >
                  <div className="text-2xl mb-3">{stage.icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{stage.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{stage.body}</p>
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="shrink-0 flex items-center px-2 text-green-300 mt-8">
                    <IconArrowRight size={16} />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* Mobile: vertical timeline */}
          <div className="lg:hidden">
            {howItWorks.map((stage, i) => (
              <div key={stage.title} className="reveal relative flex gap-4 pb-8 last:pb-0">
                {i < howItWorks.length - 1 && (
                  <div className="absolute left-4 top-10 bottom-0 w-px bg-green-200" />
                )}
                <div className="w-9 h-9 rounded-full bg-white border-2 border-green-200 flex items-center justify-center text-base shrink-0 relative z-10">
                  {stage.icon}
                </div>
                <div className="flex-1 pb-2">
                  <h3 className="font-bold text-gray-900 mb-1.5">{stage.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{stage.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features section ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="text-gray-400 text-lg">
              Simple tools that actually get used — not a feature list no one asked for.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {featureGroups.map((group, i) => (
              <div
                key={group.title}
                className="reveal bg-gray-50 rounded-2xl p-7 border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all duration-200"
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

          <p className="reveal text-center text-gray-400 text-sm mt-10">
            And yes — we keep you fully compliant with the new Renters&apos; Rights Act automatically.
            So you don&apos;t have to think about it.
          </p>
        </div>
      </section>

      {/* ── Pricing section ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Simple, honest pricing
            </h2>
            <p className="text-gray-400 text-lg">Start free. Pay only when you grow.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            {/* Free tier */}
            <div className="reveal rounded-2xl border-2 border-gray-200 bg-white p-8">
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
            <div className="reveal rounded-2xl border-2 border-green-500 bg-white p-8 relative">
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
          <div className="reveal bg-white rounded-2xl p-7">
            <p className="font-bold text-gray-900 mb-5">Pay-as-you-go extras</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {oneOffItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4 border border-gray-100"
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
                We&apos;ll be in touch before May 2026. Know another landlord who&apos;d benefit?
                Tell them about LetSorted.
              </p>
            </div>
          ) : (
            <>
              <div className="reveal mb-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                  Be first in the door
                </h2>
                <p className="text-gray-500 text-lg leading-relaxed">
                  We&apos;re building LetSorted right now. Join the waitlist and get early access.
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
            LetSorted
          </div>
          <span>LetSorted © 2026 — Built for UK landlords who manage their own properties.</span>
        </div>
      </footer>
    </>
  )
}
