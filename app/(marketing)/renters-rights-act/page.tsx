import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CrispChatLink } from './crisp-link'

export const metadata: Metadata = {
  title: "Renters' Rights Act 2025: What UK Landlords Need to Know",
  description:
    "Section 21 is abolished. Understand what the Renters' Rights Act means for you and how to protect yourself with proper tenant screening.",
  alternates: { canonical: '/renters-rights-act' },
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const timelineItems = [
  { before: 'Section 21 available', after: 'Section 21 ABOLISHED — grounds-only eviction' },
  { before: 'Periodic tenancies optional', after: 'All tenancies become periodic by default' },
  { before: 'Fixed-term ASTs allowed', after: 'No new fixed-term ASTs permitted' },
]

const cards = [
  {
    title: 'Section 21 "no-fault" evictions are abolished',
    change:
      'Landlords can no longer evict a tenant without giving a reason. Every eviction now requires a specific ground under Section 8.',
    impact:
      "Once a tenant is in, getting them out — if things go wrong — requires court proceedings with a valid legal ground. A difficult tenancy that previously took 2 months to resolve could now take 12 months or more.",
    helpTag: 'AI Tenant Vetting',
    help: "Before you hand over keys, LetSorted's AI vetting analyses bank statements to verify income, assess affordability, detect red flags like gambling, payday loans, or erratic spending — so you start the tenancy with confidence, not hope.",
  },
  {
    title: 'Fixed-term tenancies are abolished',
    change:
      'All new tenancies will be periodic from day one — rolling month to month. Landlords cannot grant a new fixed-term AST. Existing fixed terms continue until they expire, then convert automatically.',
    impact:
      'You lose the certainty of knowing your property is occupied for a defined period. Tenants can leave with 2 months\u2019 notice at any point, making void periods harder to plan for and cash flow less predictable.',
    helpTag: 'Tenancy Management',
    help: "LetSorted tracks your tenancy status in real time. When a tenant gives notice, your dashboard updates immediately — so you can open applications, start vetting candidates, and minimise void periods without scrambling.",
  },
  {
    title: 'Section 8 grounds are restructured',
    change:
      'While Section 21 is removed, several Section 8 grounds are strengthened — including a new mandatory ground for landlords who genuinely want to sell or move in a family member. Rent arrears grounds are also tightened.',
    impact:
      'Eviction for rent arrears now requires a higher threshold before the mandatory ground applies. Courts have more discretion. Getting a possession order takes longer and costs more than before.',
    helpTag: 'Rent Tracking + Paper Trail',
    help: 'LetSorted logs every rent payment — or missed payment — with a timestamp. If you ever need to evidence arrears in court, you have a complete, unambiguous record from day one of the tenancy.',
  },
  {
    title: 'Rent increases limited to once per year',
    change:
      'Landlords can only increase rent once every 12 months and must use the Section 13 process. Tenants can challenge increases at the First-tier Tribunal, which will assess whether the proposed rent is at market rate.',
    impact:
      'You cannot adjust rent to reflect rising costs more than once a year. If a tenant challenges your increase, the tribunal sets the rate — and can only rule equal to or below your proposed figure, never higher.',
    helpTag: 'Coming soon: Rent Review Notices',
    help: "LetSorted will generate compliant Section 13 notices when it's time for your annual review — with correct notice periods, prescribed wording, and a record that it was served.",
  },
  {
    title: 'Landlords must fix hazards within strict timeframes',
    change:
      "Awaab's Law, previously applying only to social housing, is being extended to the private rented sector. Landlords must investigate and repair hazards — including damp and mould — within fixed statutory timeframes.",
    impact:
      "Failing to respond to a reported hazard within the legal timeframe could result in enforcement action, fines, or civil liability. 'I didn't know' is no longer a defence if the tenant reported it.",
    helpTag: 'Maintenance Tracking',
    help: 'Every maintenance request submitted through LetSorted is timestamped and logged. You get instant notifications, can track response times, and export a complete evidence pack — every message, photo, and status update — if you ever need to demonstrate compliance.',
  },
  {
    title: 'Blanket pet bans are banned',
    change:
      'Landlords can no longer include a blanket prohibition on pets in tenancy agreements. Tenants have the right to request a pet, and landlords can only refuse with a valid reason. Landlords may require pet insurance as a condition.',
    impact:
      "Your standard 'no pets' clause is no longer enforceable as written. You'll need to update your tenancy agreement template and handle pet requests individually with documented reasoning if you decline.",
    helpTag: 'Tenancy Agreements',
    help: "LetSorted's tenancy agreement templates are updated for RRA compliance — including correct pet request handling clauses. Both parties sign digitally, and the signed document is stored permanently.",
  },
]

// ─── Icons ─────────────────────────────────────────────────────────────────────

function IconWarning({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconUser({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RentersRightsActPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 py-3 md:px-6 md:py-0 md:h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-icon.svg" alt="LetSorted" width={32} height={32} className="md:hidden" />
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="hidden md:block" />
          </Link>
          <a
            href="/screening"
            className="inline-flex items-center gap-1 md:gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm transition-colors"
          >
            <span className="md:hidden">Screening</span>
            <span className="hidden md:inline">Tenant Screening</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hidden md:block"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
          </a>
        </div>
      </nav>

      {/* Back link */}
      <div className="max-w-[1280px] mx-auto px-6 pt-6">
        <Link
          href="/"
          className="text-green-600 hover:text-green-700 text-sm font-medium inline-block"
        >
          &larr; Back to LetSorted
        </Link>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-10 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full mb-6">
            In force May 2026
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
            The Renters&apos; Rights Act: What it means for landlords
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto">
            The biggest change to rental law in 30 years. Section 21 is gone. Eviction is harder.
            Your only real protection is choosing the right tenant from the start.
          </p>
          <a
            href="/screening"
            className="inline-flex items-center gap-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg shadow-green-200/60"
          >
            Screen your next tenant &rarr;
          </a>
        </div>
      </section>

      {/* ── Timeline ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-[700px] mx-auto">
          {/* Desktop timeline */}
          <div className="hidden md:block relative">
            {/* Centre line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2" />

            {/* May 2026 marker */}
            <div className="relative flex justify-center mb-12">
              <span className="relative z-10 bg-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                May 2026
              </span>
            </div>

            {/* Headers */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <p className="text-right text-sm font-bold text-gray-400 uppercase tracking-wider">Before 2026</p>
              <p className="text-left text-sm font-bold text-amber-600 uppercase tracking-wider">May 2026 onwards</p>
            </div>

            {/* Items */}
            {timelineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-2 gap-8 mb-6 last:mb-0 items-center">
                <div className="text-right">
                  <p className="text-sm text-gray-400 line-through">{item.before}</p>
                </div>
                <div className="text-left flex items-start gap-2">
                  <IconWarning className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-900 font-medium">{item.after}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile timeline — vertical stack */}
          <div className="md:hidden">
            <div className="flex justify-center mb-8">
              <span className="bg-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                May 2026
              </span>
            </div>

            <div className="space-y-4">
              {timelineItems.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-400 line-through mb-2">{item.before}</p>
                  <div className="flex items-start gap-2">
                    <IconWarning className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-900 font-medium">{item.after}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Issue/Solution Cards ──────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              6 changes that affect every landlord
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              What&apos;s changing, what it means for you, and how LetSorted helps you stay protected.
            </p>
          </div>

          <div className="space-y-8 max-w-3xl mx-auto">
            {cards.map((card, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* THE CHANGE */}
                <div className="border-l-4 border-amber-400 bg-amber-50/50 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <IconWarning className="text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">The change</span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{card.change}</p>
                </div>

                {/* WHAT THIS MEANS FOR YOU */}
                <div className="border-l-4 border-red-300 bg-red-50/40 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <IconUser className="text-red-400 shrink-0" />
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider">What this means for you</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{card.impact}</p>
                </div>

                {/* HOW LETSORTED HELPS */}
                <div className="border-l-4 border-green-400 bg-green-50/40 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <IconCheck className="text-green-500 shrink-0" />
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider">How LetSorted helps</span>
                  </div>
                  <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2">
                    {card.helpTag}
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">{card.help}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: '#1a3d2b' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            The landlords who thrive under the new rules will be the ones who chose well from the start.
          </h2>
          <p className="text-green-200/80 text-lg mb-10">
            AI tenant vetting. Compliant agreements. Maintenance records. Everything in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/screening"
              className="inline-flex items-center gap-2 bg-white text-green-800 font-bold text-lg px-8 py-4 rounded-xl transition-colors hover:bg-green-50"
            >
              Vet your next tenant — from &pound;9.99
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-colors hover:bg-white/10"
            >
              See everything LetSorted does
            </Link>
          </div>
          <CrispChatLink />
        </div>
      </section>
    </main>
  )
}
