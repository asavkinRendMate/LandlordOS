'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

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

const journeySteps = [
  {
    icon: '🔍',
    title: 'Find the right tenant',
    body: 'Share one link in your Rightmove or OpenRent listing. Applicants upload their documents. You get an AI summary — income verified, affordability checked, red flags flagged.',
    slug: 'tenant-screening',
  },
  {
    icon: '📋',
    title: 'Move them in properly',
    body: "Generate a legally compliant tenancy agreement in minutes. Both parties sign online. Capture a timestamped photo inventory — your protection if there's ever a deposit dispute.",
    slug: 'move-in',
  },
  {
    icon: '🏠',
    title: 'Manage without the chaos',
    body: 'Rent reminders go out automatically. Tenants submit maintenance requests through their own portal, with photos and a paper trail. You get alerts before certificates expire.',
    slug: 'property-management',
  },
  {
    icon: '🛡️',
    title: 'Handle issues properly',
    body: "Need to raise the rent? We generate the correct notice. Things go wrong? Export a complete evidence pack — every message, photo and payment — in one click.",
    slug: 'issue-management',
  },
  {
    icon: '🔄',
    title: 'Start again, stress-free',
    body: 'Once the tenancy ends, your property is back to vacant in one click. Run the check-out inspection, handle the deposit, and open applications again.',
    slug: 'tenancy-renewal',
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
  { name: 'Screening Check', price: '£9.99', desc: 'First check/month (£1.49 each additional)' },
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

function IconChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [properties, setProperties] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Beta modal state
  const [betaOpen, setBetaOpen] = useState(false)
  const [betaCode, setBetaCode] = useState('')
  const [betaError, setBetaError] = useState(false)
  const betaInputRef = useRef<HTMLInputElement>(null)

  // Journey slider state
  const [currentSlide, setCurrentSlide] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const touchStartRef = useRef(0)
  const touchDeltaRef = useRef(0)

  useEffect(() => {
    if (betaOpen) betaInputRef.current?.focus()
  }, [betaOpen])

  const handleBetaSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (betaCode === '4577') {
        sessionStorage.setItem('betaAccess', 'true')
        router.push('/login')
      } else {
        setBetaError(true)
        setTimeout(() => setBetaError(false), 400)
      }
    },
    [betaCode, router],
  )

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

  // Viewport width for carousel sizing
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
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

  // Carousel computed values
  const SLIDER_GAP = 24
  const containerInner = viewportWidth > 0
    ? Math.min(1280, viewportWidth) - 48 // 48 = px-6 * 2
    : 1000
  const isDesktop = viewportWidth >= 1280
  const isTablet = viewportWidth >= 768 && !isDesktop
  // Arrow room: md:mx-14 (56px) on tablet, xl:mx-16 (64px) on desktop, 0 on mobile
  const arrowRoom = isDesktop ? 64 : isTablet ? 56 : 0
  const trackWidth = containerInner - arrowRoom * 2
  const cardWidth = isDesktop
    ? Math.floor((trackWidth - 2 * SLIDER_GAP) / 3)
    : isTablet
      ? Math.floor((trackWidth - 2 * SLIDER_GAP) / 2.3)
      : trackWidth
  const totalTrack = journeySteps.length * cardWidth + (journeySteps.length - 1) * SLIDER_GAP
  const maxSlide = Math.max(0, Math.ceil((totalTrack - trackWidth) / (cardWidth + SLIDER_GAP) - 0.01))
  const activeSlide = Math.min(currentSlide, maxSlide)
  const sliderTranslateX = -(activeSlide * (cardWidth + SLIDER_GAP))

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
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Image src="/logo.svg" alt="LetSorted" width={150} height={50} priority />
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setBetaOpen(true)}
              className="border border-green-600 text-green-600 bg-white hover:bg-green-600/[0.06] font-semibold px-5 py-2.5 rounded-lg text-sm transition-all duration-150"
            >
              Closed Beta
            </button>
            <a
              href="/screening"
              className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
            >
              Tenant Screening
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
            </a>
          </div>
        </div>
      </nav>

      {/* ── RRA banner ─────────────────────────────────────────────────────── */}
      <div className="bg-[#FEF9EC] border-b border-[#F5E5A0]" style={{ padding: '10px 24px' }}>
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4 text-center sm:text-left">
          <p className="text-sm text-amber-900">
            <span className="mr-1.5">📋</span>
            Renters&apos; Rights Act 2026 — the biggest change to rental law in 30 years.
          </p>
          <a
            href="/renters-rights-act"
            className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors whitespace-nowrap"
          >
            Are you prepared? &rarr;
          </a>
        </div>
      </div>

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
              Built for UK self-managing landlords with 1–5 properties.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pain section ──────────────────────────────────────────────────── */}
      <section className="pt-0 pb-20 px-6 bg-white">
        <div className="max-w-[1280px] mx-auto">
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

      {/* ── Journey section (slider) ─────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        {/* Header */}
        <div className="max-w-[1280px] mx-auto px-6 mb-14">
          <div className="reveal text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              From empty property to happy tenant — and everything in between
            </h2>
            <p className="text-gray-400 text-lg">
              LetSorted guides you through every stage of renting.
            </p>
          </div>
        </div>

        {/* Slider */}
        <div
          className="max-w-[1280px] mx-auto px-6 focus:outline-none"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' && activeSlide > 0) setCurrentSlide(activeSlide - 1)
            if (e.key === 'ArrowRight' && activeSlide < maxSlide)
              setCurrentSlide(activeSlide + 1)
          }}
        >
          {/* Arrow-relative wrapper */}
          <div className="relative">
            {/* Track — md:mx-14 and xl:mx-16 create room for arrows */}
            <div className="overflow-hidden md:mx-14 xl:mx-16">
              <div
                className="flex"
                style={{
                  gap: `${SLIDER_GAP}px`,
                  transform: `translateX(${sliderTranslateX}px)`,
                  transition: viewportWidth > 0 ? 'transform 300ms ease' : 'none',
                }}
                onTouchStart={(e) => {
                  touchStartRef.current = e.touches[0].clientX
                  touchDeltaRef.current = 0
                }}
                onTouchMove={(e) => {
                  touchDeltaRef.current = e.touches[0].clientX - touchStartRef.current
                }}
                onTouchEnd={() => {
                  if (Math.abs(touchDeltaRef.current) > 50) {
                    if (touchDeltaRef.current < 0 && activeSlide < maxSlide)
                      setCurrentSlide(activeSlide + 1)
                    else if (touchDeltaRef.current > 0 && activeSlide > 0)
                      setCurrentSlide(activeSlide - 1)
                  }
                }}
              >
                {journeySteps.map((step, i) => (
                  <div
                    key={step.slug}
                    className="shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
                    style={{ width: `${cardWidth}px` }}
                  >
                    {/* Screenshot 16:9 */}
                    <div
                      className="relative w-full"
                      style={{
                        paddingTop: '56.25%',
                        background: 'linear-gradient(135deg, #E8F0EB 0%, #D4E6D9 100%)',
                        boxShadow: 'inset 0 0 0 1px rgba(45,106,79,0.1)',
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-sm text-[#16a34a]/40 font-medium">
                        [ Screenshot coming soon ]
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="text-2xl mb-2">{step.icon}</div>
                      <p className="text-xs text-gray-400 mb-1">Step {i + 1} of 5</p>
                      <h3 className="font-semibold text-base text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed mb-3 flex-1">{step.body}</p>
                      <a
                        href={`/features/${step.slug}`}
                        className="text-green-600 font-semibold text-sm hover:text-green-700 transition-colors"
                      >
                        See how it works &rarr;
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow buttons — hidden on mobile, visible on tablet + desktop */}
            <button
              onClick={() => activeSlide > 0 && setCurrentSlide(activeSlide - 1)}
              className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white shadow-md text-green-600 hover:text-green-700 transition-colors ${activeSlide === 0 ? 'opacity-50 cursor-default' : ''}`}
              aria-label="Previous slide"
              disabled={activeSlide === 0}
            >
              <IconChevronLeft />
            </button>
            <button
              onClick={() => activeSlide < maxSlide && setCurrentSlide(activeSlide + 1)}
              className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white shadow-md text-green-600 hover:text-green-700 transition-colors ${activeSlide === maxSlide ? 'opacity-50 cursor-default' : ''}`}
              aria-label="Next slide"
              disabled={activeSlide === maxSlide}
            >
              <IconChevronRight />
            </button>
          </div>

          {/* Dot indicators — tablet + mobile only */}
          <div className="xl:hidden flex justify-center gap-1.5 mt-6">
            {journeySteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === activeSlide ? 'bg-green-600' : 'bg-gray-300'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features section ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-[1280px] mx-auto">
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

      {/* ── Beta access modal ──────────────────────────────────────────────── */}
      {betaOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          onClick={() => setBetaOpen(false)}
        >
          <div
            className="relative bg-white rounded-xl p-6 w-full max-w-[360px] mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setBetaOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-4">Enter access code</h3>

            <form onSubmit={handleBetaSubmit} className="space-y-3">
              <input
                ref={betaInputRef}
                type="password"
                placeholder="Access code"
                value={betaCode}
                onChange={(e) => setBetaCode(e.target.value)}
                className={`w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${betaError ? 'shake' : ''}`}
              />
              {betaError && (
                <p className="text-red-500 text-sm">Invalid access code</p>
              )}
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors duration-150"
              >
                Enter
              </button>
            </form>
          </div>
        </div>
      )}

    </>
  )
}
