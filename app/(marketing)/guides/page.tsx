import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getAllGuides } from '@/lib/guides'

export const metadata: Metadata = {
  title: 'Landlord Guides — Practical Advice for UK Landlords',
  description:
    'Practical guides for UK landlords navigating tenant screening, the Renters\' Rights Act, compliance, and property management.',
  alternates: { canonical: '/guides' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function GuidesIndexPage() {
  const guides = getAllGuides()

  return (
    <>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 py-3 md:px-6 md:py-0 md:h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-icon.svg" alt="LetSorted" width={32} height={32} className="md:hidden" priority />
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="hidden md:block" priority />
          </Link>
          <div className="flex items-center gap-1.5 md:gap-2.5">
            <Link
              href="/guides"
              className="text-green-700 font-semibold px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm"
            >
              Guides
            </Link>
            <Link
              href="/screening"
              className="inline-flex items-center gap-1 md:gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm transition-colors duration-150"
            >
              <span className="md:hidden">Screening</span>
              <span className="hidden md:inline">Tenant Screening</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hidden md:block"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-6 bg-gradient-to-b from-green-50 via-green-50/40 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Landlord Guides
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Practical guides for UK landlords navigating a changing rental market.
          </p>
        </div>
      </section>

      {/* ── Articles Grid ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        {guides.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Guides coming soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guides.map((guide) => (
              <Link
                key={guide.frontmatter.slug}
                href={`/guides/${guide.frontmatter.slug}`}
                className="group block border border-gray-200 rounded-xl p-6 hover:border-green-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {guide.frontmatter.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors mb-2">
                  {guide.frontmatter.title}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3">
                  {guide.frontmatter.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{guide.frontmatter.readingTime} min read</span>
                  <span>{formatDate(guide.frontmatter.publishedAt)}</span>
                </div>
                <div className="mt-4 text-sm font-semibold text-green-600 group-hover:text-green-700 flex items-center gap-1 transition-colors">
                  Read guide
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="bg-green-50 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Ready to screen your next tenant?
          </h2>
          <p className="text-gray-500 mb-6">
            AI-powered financial checks in under 5 minutes. No subscription required.
          </p>
          <Link
            href="/screening"
            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
          >
            Start Screening
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
          </Link>
        </div>
      </section>
    </>
  )
}
