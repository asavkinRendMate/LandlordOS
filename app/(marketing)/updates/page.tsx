import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllUpdates, type UpdateTag } from '@/lib/updates'

export const metadata: Metadata = {
  title: 'What\'s new — LetSorted',
  description:
    'Latest features, improvements, and fixes to LetSorted — the property management platform for UK landlords.',
  alternates: { canonical: '/updates' },
}

const tagStyles: Record<UpdateTag, string> = {
  'New feature': 'bg-green-50 text-green-700',
  Improvement: 'bg-blue-50 text-blue-700',
  Fix: 'bg-amber-50 text-amber-700',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function UpdatesPage() {
  const updates = getAllUpdates()

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
              className="text-gray-600 hover:text-green-700 font-semibold px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm transition-colors"
            >
              Guides
            </Link>
            <Link
              href="/updates"
              className="text-green-700 font-semibold px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm"
            >
              Updates
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
            What&apos;s new
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Latest features and improvements to LetSorted
          </p>
        </div>
      </section>

      {/* ── Timeline ────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        {updates.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Updates coming soon.</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200 hidden sm:block" />

            <div className="space-y-10">
              {updates.map((update) => (
                <div key={update.slug} className="relative sm:pl-10">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-green-500 bg-white hidden sm:block" />

                  {/* Date + tag */}
                  <div className="flex items-center gap-3 mb-2">
                    <time className="text-sm text-gray-400">{formatDate(update.date)}</time>
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${tagStyles[update.tag]}`}
                    >
                      {update.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-gray-900 mb-2">
                    {update.title}
                  </h2>

                  {/* Summary */}
                  <p className="text-gray-500 leading-relaxed">
                    {update.summary}
                  </p>

                  {/* Optional MDX body */}
                  {update.content.trim() && (
                    <div className="mt-4 prose-custom text-sm">
                      <MDXRemote source={update.content} />
                    </div>
                  )}
                </div>
              ))}
            </div>
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
