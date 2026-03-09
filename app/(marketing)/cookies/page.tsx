import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import ManageCookiesButton from './manage-cookies-button'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How LetSorted uses cookies and how you can manage your preferences.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/cookies' },
}

function CookieTable({ rows }: { rows: Array<{ name: string; provider: string; purpose: string; duration: string }> }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="py-2 pr-4 font-semibold text-gray-700">Name</th>
            <th className="py-2 pr-4 font-semibold text-gray-700">Provider</th>
            <th className="py-2 pr-4 font-semibold text-gray-700">Purpose</th>
            <th className="py-2 font-semibold text-gray-700">Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-mono text-xs text-gray-800">{row.name}</td>
              <td className="py-2 pr-4 text-gray-600">{row.provider}</td>
              <td className="py-2 pr-4 text-gray-600">{row.purpose}</td>
              <td className="py-2 text-gray-600 whitespace-nowrap">{row.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const necessaryCookies = [
  { name: 'cc_cookie', provider: 'LetSorted', purpose: 'Stores your cookie consent preferences', duration: '6 months' },
  { name: 'sb-*-auth-token', provider: 'Supabase', purpose: 'Authentication session', duration: 'Session' },
  { name: 'crisp-client/*', provider: 'Crisp', purpose: 'Live chat session identifier', duration: '6 months' },
]

const analyticsCookies = [
  { name: '_ga', provider: 'Google', purpose: 'Distinguishes unique users for analytics', duration: '2 years' },
  { name: '_gid', provider: 'Google', purpose: 'Distinguishes unique users (24h window)', duration: '24 hours' },
  { name: '_gat', provider: 'Google', purpose: 'Throttles analytics request rate', duration: '1 minute' },
]

const marketingCookies = [
  { name: '_fbp', provider: 'Meta', purpose: 'Facebook Pixel tracking', duration: '3 months' },
  { name: '_fbc', provider: 'Meta', purpose: 'Facebook click identifier', duration: '3 months' },
]

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 md:px-6 md:py-0 md:h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-icon.svg" alt="LetSorted" width={28} height={28} className="md:hidden" priority />
            <Image src="/logo.svg" alt="LetSorted" width={120} height={40} className="hidden md:block" priority />
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to LetSorted
          </Link>
        </div>
      </nav>

      <div className="max-w-[720px] mx-auto px-6 py-12 lg:py-16">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Cookie Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

        <div className="space-y-10 text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">What are cookies?</h2>
            <p>
              Cookies are small text files placed on your device when you visit a website. They help
              the site remember your preferences, keep you signed in, and understand how you use the
              service. Some cookies are essential for the site to function; others help us improve
              your experience or deliver relevant content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How we use cookies</h2>
            <p>
              LetSorted uses cookies in three categories. Essential cookies are always active because
              the site cannot function without them. Analytics and marketing cookies are only loaded
              after you give consent via our cookie banner.
            </p>
          </section>

          {/* NECESSARY */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Necessary cookies</h2>
            <p className="mb-4 text-sm">
              These cookies are required for the site to function and cannot be disabled.
            </p>
            <CookieTable rows={necessaryCookies} />
          </section>

          {/* ANALYTICS */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics cookies</h2>
            <p className="mb-4 text-sm">
              These cookies help us understand how visitors use LetSorted so we can improve the
              experience. They are only set after you consent.
            </p>
            <CookieTable rows={analyticsCookies} />
          </section>

          {/* MARKETING */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Marketing cookies</h2>
            <p className="mb-4 text-sm">
              These cookies are used to measure the effectiveness of our advertising. They are only
              set after you consent.
            </p>
            <CookieTable rows={marketingCookies} />
          </section>

          {/* MANAGE PREFERENCES */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage your preferences</h2>
            <p className="mb-4">
              You can change your cookie preferences at any time by clicking the button below.
              This will reopen the consent banner so you can update your choices.
            </p>
            <ManageCookiesButton />
          </section>

          {/* LINK TO PRIVACY */}
          <section>
            <p>
              For more information about how we handle your personal data, see our{' '}
              <Link href="/privacy" className="text-green-700 hover:underline font-medium">
                Privacy Policy
              </Link>.
            </p>
          </section>

        </div>
      </div>

    </div>
  )
}
