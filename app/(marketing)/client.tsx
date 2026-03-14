'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import DemoModal from '@/components/DemoModal'
import type { UpdateTag } from '@/lib/updates'

export interface LandingUpdate {
  title: string
  date: string
  tag: UpdateTag
  summary: string
}

const updateTagStyles: Record<UpdateTag, string> = {
  'New feature': 'bg-green-50 text-green-700',
  Improvement: 'bg-blue-50 text-blue-700',
  Fix: 'bg-amber-50 text-amber-700',
}

function formatUpdateDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const painPoints = [
  {
    icon: '⚖️',
    title: 'Without Section 21, you need evidence',
    body: 'Since 1 May 2026, the only way to end a tenancy is through court. Judges need proof — a signed contract, rent records, inspection reports. Landlords on spreadsheets arrive with nothing.',
  },
  {
    icon: '📸',
    title: 'Deposit disputes are won on evidence',
    body: "95% of deposit disputes come down to one question: what was the condition at move-in? Without a signed, timestamped inspection report, the adjudicator sides with the tenant.",
  },
  {
    icon: '⏰',
    title: 'Compliance failures are expensive',
    body: "Gas Safety, EICR, EPC — missing certificates mean up to £30,000 in fines and an invalid Section 8 notice. You can't evict a tenant if your compliance is out of date.",
  },
  {
    icon: '💬',
    title: "WhatsApp isn't a paper trail",
    body: 'Maintenance requests in texts, rent agreements in emails, inspection notes in a notebook. When a tenant makes a counterclaim, you have nothing admissible.',
  },
]

const journeySteps = [
  {
    icon: '🔍',
    title: 'Screen with confidence',
    body: 'Share one link in your listing. Applicants upload bank statements. AI verifies income and affordability — documented and timestamped.',
    slug: 'tenant-screening',
  },
  {
    icon: '📋',
    title: 'Move in with a paper trail',
    body: 'RRA 2025-compliant contract, signed digitally with IP and timestamp. Move-in inspection signed by both parties. Your evidence starts here.',
    slug: 'move-in',
  },
  {
    icon: '🏠',
    title: 'Manage with a full audit log',
    body: 'Every maintenance request logged, every rent payment recorded, every certificate tracked. Nothing lost.',
    slug: 'property-management',
  },
  {
    icon: '🛡️',
    title: 'Raise issues properly',
    body: 'Section 8 notices generated correctly. And if it goes further — export your complete Dispute Evidence Pack in one click: contract, inspections, rent ledger, maintenance history.',
    slug: 'issue-management',
  },
  {
    icon: '🔄',
    title: 'Move on cleanly',
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

type CellValue = 'check' | 'cross' | string

const comparisonRows: { feature: string; paper: CellValue; typical: CellValue; letsorted: CellValue; isPrice?: boolean }[] = [
  { feature: 'Compliance document tracking', paper: 'cross', typical: 'check', letsorted: 'check' },
  { feature: 'Expiry reminders', paper: 'cross', typical: 'check', letsorted: 'check' },
  { feature: 'Rent tracking', paper: 'Manual', typical: 'check', letsorted: 'check' },
  { feature: 'Tenant portal', paper: 'cross', typical: 'Sometimes', letsorted: 'check' },
  { feature: 'Maintenance tracking', paper: 'WhatsApp / email', typical: 'Basic', letsorted: 'check' },
  { feature: "Awaab's Law compliance", paper: 'cross', typical: 'cross', letsorted: 'check' },
  { feature: 'RRA 2025 compliant contracts', paper: 'cross', typical: 'cross', letsorted: 'check' },
  { feature: 'Digital contract signing', paper: 'cross', typical: 'cross', letsorted: 'check' },
  { feature: 'AI tenant screening', paper: 'cross', typical: 'cross', letsorted: 'check' },
  { feature: 'Move-in inspection reports', paper: 'cross', typical: 'cross', letsorted: 'check' },
  { feature: 'Tenant sign-off on inspections', paper: 'cross', typical: 'cross', letsorted: 'check' },
  { feature: 'Price for 1 property', paper: 'Free*', typical: '£20–50/mo', letsorted: 'Free forever', isPrice: true },
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
  { name: 'Screening Check', price: '£9.99', desc: 'First check (£1.49 each additional)' },
  { name: 'APT Contract', price: '£9.99', desc: 'Legally-reviewed template' },
  { name: 'Section 13 Notice', price: '£4.99', desc: 'Rent increase notice (RRA 2025)' },
  { name: 'Dispute Evidence Pack', price: '£29.99', desc: 'Evidence bundle for disputes' },
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

// ─── Comparison cell ──────────────────────────────────────────────────────────

function ComparisonCell({ value, bold, isLetSorted }: { value: CellValue; bold?: boolean; isLetSorted?: boolean }) {
  if (value === 'check') {
    return (
      <span className={`inline-flex items-center justify-center ${isLetSorted ? 'text-green-600' : 'text-green-500'}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    )
  }
  if (value === 'cross') {
    return (
      <span className="inline-flex items-center justify-center text-gray-300">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    )
  }
  // Text values: "Manual", "Sometimes", "Basic", price strings
  const isAmber = value === 'Manual' || value === 'Sometimes'
  const color = isLetSorted && bold
    ? 'text-green-700 font-bold'
    : bold
      ? 'font-bold text-gray-900'
      : isAmber
        ? 'text-amber-600'
        : 'text-gray-400'
  return <span className={`text-sm ${color}`}>{value}</span>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage({ updates }: { updates: LandingUpdate[] }) {
  // Demo modal
  const [demoOpen, setDemoOpen] = useState(false)

  // Auth-aware dashboard CTA: 'loading' → 'guest' | { href, label }
  const [ctaState, setCtaState] = useState<'loading' | 'guest' | { href: string; label: string }>('loading')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setCtaState('guest')
        return
      }
      try {
        const res = await fetch('/api/user/profile')
        if (!res.ok) { setCtaState('guest'); return }
        const json = await res.json()
        if (json.data?.hasTenantProfile) {
          setCtaState({ href: '/tenant/dashboard', label: 'Tenant Dashboard' })
        } else {
          setCtaState({ href: '/dashboard', label: 'Landlord Dashboard' })
        }
      } catch {
        setCtaState('guest')
      }
    })
  }, [])

  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  // Journey slider state
  const [currentSlide, setCurrentSlide] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const touchStartRef = useRef(0)
  const touchDeltaRef = useRef(0)

  // Lightbox Escape key
  useEffect(() => {
    if (!lightboxSrc) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxSrc(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxSrc])

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
        <div className="max-w-[1280px] mx-auto px-4 py-3 md:px-6 md:py-0 md:h-16 flex items-center justify-between">
          <Image src="/logo-icon.svg" alt="LetSorted" width={32} height={32} className="md:hidden" priority />
          <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="hidden md:block" priority />
          <div className="flex items-center gap-1.5 md:gap-2.5">
            <a
              href="/guides"
              className="border border-green-600 text-green-600 bg-white hover:bg-green-600/[0.06] font-semibold px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm transition-all duration-150"
            >
              Guides
            </a>
            {ctaState === 'loading' ? (
              <span className="border border-green-600 bg-white font-semibold px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm inline-flex items-center justify-center min-w-[90px] md:min-w-[110px]">
                <svg className="animate-spin h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </span>
            ) : ctaState === 'guest' ? (
              <a
                href="/login"
                className="border border-green-600 text-green-600 bg-white hover:bg-green-600/[0.06] font-semibold px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm transition-all duration-150"
              >
                Sign In
              </a>
            ) : (
              <a
                href={ctaState.href}
                className="border border-green-600 text-green-600 bg-white hover:bg-green-600/[0.06] font-semibold px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm transition-all duration-150"
              >
                {ctaState.label}
              </a>
            )}
            <a
              href="/screening"
              className="inline-flex items-center gap-1 md:gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm transition-colors duration-150"
            >
              <span className="md:hidden">Screening</span>
              <span className="hidden md:inline">Tenant Screening</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hidden md:block"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
            </a>
          </div>
        </div>
      </nav>

      {/* ── RRA banner ─────────────────────────────────────────────────────── */}
      <div className="bg-[#FEF9EC] border-b border-[#F5E5A0]" style={{ padding: '10px 24px' }}>
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4 text-center sm:text-left">
          <p className="text-sm text-amber-900">
            <span className="mr-1.5">⚖️</span>
            Section 21 is abolished from 1 May 2026. Evictions now require court evidence. Is your paperwork ready?
          </p>
          <a
            href="/renters-rights-act"
            className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors whitespace-nowrap"
          >
            See what changes &rarr;
          </a>
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-6 bg-gradient-to-b from-green-50 via-green-50/40 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="hero-0 text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
            When a tenancy goes wrong,{' '}
            <span className="text-green-600">your evidence wins.</span>
          </h1>

          <p className="hero-1 text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            Section 21 is gone. Evictions now require proof — in court. LetSorted automatically builds the complete evidence trail every landlord needs: signed contracts, inspection reports, rent records, and a one-click dispute pack.
          </p>

          <div className="hero-2">
            <button
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors duration-150 shadow-lg shadow-green-200/60"
            >
              Try for free &rarr;
            </button>
            <p className="mt-4 text-sm text-gray-400">
              Free for your first property. Built for UK self-managing landlords.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pain section ──────────────────────────────────────────────────── */}
      <section className="pt-0 pb-20 px-6 bg-white">
        <div className="max-w-[1280px] mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              The law has changed. Has your paperwork?
            </h2>
            <p className="text-gray-400 text-lg">
              Section 21 abolition means every landlord needs an evidence trail.
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
              Every step builds your protection
            </h2>
            <p className="text-gray-400 text-lg">
              LetSorted doesn&apos;t just help you manage — it automatically creates the legal record you&apos;d need in court.
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
            <div className="overflow-x-clip py-2 md:mx-14 xl:mx-16">
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
                    className="shrink-0 bg-white rounded-xl shadow-md border border-gray-100 flex flex-col overflow-hidden"
                    style={{ width: `${cardWidth}px` }}
                  >
                    {/* Screenshot 4:3 */}
                    {step.slug === 'tenant-screening' ? (
                      <button
                        type="button"
                        onClick={() => setLightboxSrc('/screenshots/find-the-right-tenant.jpg')}
                        className="relative w-full aspect-[4/3] overflow-hidden cursor-zoom-in"
                      >
                        <Image
                          src="/screenshots/find-the-right-tenant.jpg"
                          alt="Find the right tenant — screening invite and AI report"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 33vw"
                        />
                      </button>
                    ) : step.slug === 'move-in' ? (
                      <button
                        type="button"
                        onClick={() => setLightboxSrc('/screenshots/move-in.png')}
                        className="relative w-full aspect-[4/3] overflow-hidden cursor-zoom-in"
                      >
                        <Image
                          src="/screenshots/move-in.png"
                          alt="Move them in properly — contracts, deposits and compliance"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 33vw"
                        />
                      </button>
                    ) : step.slug === 'property-management' ? (
                      <button
                        type="button"
                        onClick={() => setLightboxSrc('/screenshots/manage-property.png')}
                        className="relative w-full aspect-[4/3] overflow-hidden cursor-zoom-in"
                      >
                        <Image
                          src="/screenshots/manage-property.png"
                          alt="Manage without the chaos — property dashboard overview"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 33vw"
                        />
                      </button>
                    ) : (
                      <div
                        className="w-full aspect-[4/3] flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #E8F0EB 0%, #D4E6D9 100%)',
                          boxShadow: 'inset 0 0 0 1px rgba(45,106,79,0.1)',
                        }}
                      >
                        <span className="text-sm text-[#16a34a]/40 font-medium">
                          [ Screenshot coming soon ]
                        </span>
                      </div>
                    )}

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

      {/* ── Evidence pack section ──────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="reveal text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              When it goes to court, LetSorted has your back
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">
              Most tenancies end without problems. But when one doesn&apos;t, the landlord with evidence wins. LetSorted builds that evidence automatically — from day one.
            </p>
          </div>

          <div className="reveal grid sm:grid-cols-2 gap-4">
            {[
              'Signed tenancy agreement with digital signatures, IP addresses and timestamps',
              'Move-in inspection report signed by both parties',
              'Complete rent payment history with arrears highlighted',
              'Every maintenance request — dated, photographed, tracked',
              'All periodic inspection reports in chronological order',
              'One-click Dispute Evidence Pack — everything your solicitor needs',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 bg-green-50/60 rounded-xl p-4 border border-green-100">
                <IconCheck className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
              </div>
            ))}
          </div>

          <p className="reveal text-center text-gray-400 text-xs mt-8 max-w-xl mx-auto">
            LetSorted is not a law firm and does not provide legal advice. Evidence packs contain factual records to support your case.
          </p>
        </div>
      </section>

      {/* ── Comparison table section ──────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Why landlords choose LetSorted
            </h2>
            <p className="text-gray-400 text-lg">
              See how we compare to the alternatives
            </p>
          </div>

          <div className="reveal overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 w-[40%]" />
                  <th className="py-3 px-4 font-semibold text-gray-500 text-center">
                    Paper &amp; Spreadsheets
                  </th>
                  <th className="py-3 px-4 font-semibold text-gray-500 text-center">
                    Typical Property Software
                  </th>
                  <th className="py-3 px-4 font-semibold text-white text-center bg-green-600 rounded-t-xl">
                    LetSorted
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className={`py-3 px-4 text-gray-700 ${row.isPrice ? 'font-semibold' : ''}`}>
                      {row.feature}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <ComparisonCell value={row.paper} bold={row.isPrice} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <ComparisonCell value={row.typical} bold={row.isPrice} />
                    </td>
                    <td className={`py-3 px-4 text-center bg-green-50/60 ${i === comparisonRows.length - 1 ? 'rounded-b-xl' : ''}`}>
                      <ComparisonCell value={row.letsorted} bold={row.isPrice} isLetSorted />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="reveal text-center text-gray-400 text-xs mt-6 max-w-xl mx-auto">
            *Spreadsheets are free but cost time, missed compliance deadlines, and potentially &pound;30,000+ in fines.
          </p>
        </div>
      </section>

      {/* ── What's new section ────────────────────────────────────────────── */}
      {updates.length > 0 && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="reveal text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                What&apos;s new
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-5">
              {updates.map((update) => (
                <div
                  key={update.title}
                  className="reveal bg-white rounded-xl border border-gray-100 p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <time className="text-xs text-gray-400">{formatUpdateDate(update.date)}</time>
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${updateTagStyles[update.tag]}`}
                    >
                      {update.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-[15px] leading-snug mb-2">
                    {update.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                    {update.summary}
                  </p>
                </div>
              ))}
            </div>

            <div className="reveal text-center mt-8">
              <a
                href="/updates"
                className="text-sm text-green-700 font-medium hover:underline"
              >
                See all updates &rarr;
              </a>
            </div>
          </div>
        </section>
      )}

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
              <p className="text-5xl font-extrabold text-gray-900">£9.99</p>
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

      {/* ── CTA section ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-green-50">
        <div className="max-w-md mx-auto text-center reveal">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ready to protect your rental?
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed mb-8">
            Free for your first property. No credit card required.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors duration-150 shadow-lg shadow-green-200/60"
          >
            Get started free &rarr;
          </a>
        </div>
      </section>

      {/* ── Demo modal ─────────────────────────────────────────────────────── */}
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />

      {/* ── Screenshot lightbox ────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxSrc}
              alt="Screenshot full view"
              className="max-h-[85vh] mx-auto rounded-xl object-contain w-full"
            />
          </div>
        </div>
      )}

    </>
  )
}
