import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — LetSorted',
  description: 'How Rendmate Ltd collects, uses and protects your personal data when you use LetSorted.',
}

const sections = [
  { id: 'introduction',       title: '1. Introduction' },
  { id: 'what-we-collect',    title: '2. What data we collect' },
  { id: 'how-we-use',         title: '3. How we use your data' },
  { id: 'storage-security',   title: '4. Data storage and security' },
  { id: 'your-rights',        title: '5. Your rights under UK GDPR' },
  { id: 'cookies',            title: '6. Cookies' },
  { id: 'contact',            title: '7. Contact' },
  { id: 'changes',            title: '8. Changes to this policy' },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.svg" alt="LetSorted" width={120} height={40} priority />
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

      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">

          {/* Sidebar ToC — desktop only */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Contents</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-gray-500 hover:text-gray-900 py-1 transition-colors leading-snug"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
            <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

            <div className="space-y-12 text-gray-600 leading-relaxed">

              <section id="introduction">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                <p>
                  LetSorted is a product of Rendmate Ltd (Company No. 14230492), registered in England and Wales.
                  We are committed to protecting your personal data in accordance with the UK GDPR and the
                  Data Protection Act 2018.
                </p>
                <p className="mt-3">
                  This policy explains what personal data we collect, why we collect it, how we use it,
                  and what rights you have over it.
                </p>
              </section>

              <section id="what-we-collect">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. What data we collect</h2>
                <h3 className="font-semibold text-gray-800 mb-2">Landlords</h3>
                <ul className="list-disc list-outside ml-5 space-y-1.5 mb-5">
                  <li>Name and email address</li>
                  <li>Property addresses and details</li>
                  <li>Tenancy information you enter into the platform</li>
                  <li>Documents you upload (certificates, contracts, inventory reports)</li>
                  <li>Usage data and login timestamps</li>
                </ul>
                <h3 className="font-semibold text-gray-800 mb-2">Tenants</h3>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>Name, email address, and phone number</li>
                  <li>Identity and financial documents (if uploaded during application)</li>
                  <li>Maintenance requests and related communications</li>
                  <li>Document acknowledgment records</li>
                </ul>
              </section>

              <section id="how-we-use">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How we use your data</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>To provide the LetSorted service</li>
                  <li>To send transactional emails (rent reminders, maintenance notifications, magic links)</li>
                  <li>To store and retrieve your documents securely</li>
                </ul>
                <p className="mt-4 font-medium text-gray-700">We do not sell your data to third parties. We do not use your data for advertising.</p>
              </section>

              <section id="storage-security">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data storage and security</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>Data is stored on Supabase infrastructure (EU region)</li>
                  <li>Documents are stored in encrypted cloud storage</li>
                  <li>All connections are SSL encrypted</li>
                  <li>We use Resend for transactional email delivery</li>
                </ul>
              </section>

              <section id="your-rights">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Your rights under UK GDPR</h2>
                <p className="mb-3">You have the following rights regarding your personal data:</p>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li><strong>Right to access</strong> — request a copy of the data we hold about you</li>
                  <li><strong>Right to correction</strong> — request that inaccurate data be corrected</li>
                  <li><strong>Right to erasure</strong> — request deletion of your data ("right to be forgotten")</li>
                  <li><strong>Right to data portability</strong> — receive your data in a portable format</li>
                </ul>
                <p className="mt-4">
                  To exercise any of these rights, contact us at{' '}
                  <a href="mailto:hello@letsorted.co.uk" className="text-green-700 hover:underline">
                    hello@letsorted.co.uk
                  </a>
                </p>
              </section>

              <section id="cookies">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Cookies</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>We use essential cookies only (authentication session management)</li>
                  <li>We do not use advertising or tracking cookies</li>
                </ul>
              </section>

              <section id="contact">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Contact</h2>
                <p>If you have any questions about this Privacy Policy, please contact us:</p>
                <address className="not-italic mt-3 space-y-1 text-gray-700">
                  <p className="font-medium">Rendmate Ltd</p>
                  <p>167–169 Great Portland Street, London, England, W1W 5PF</p>
                  <a href="mailto:hello@letsorted.co.uk" className="text-green-700 hover:underline">
                    hello@letsorted.co.uk
                  </a>
                </address>
              </section>

              <section id="changes">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Changes to this policy</h2>
                <p>
                  Last updated: March 2026. We will notify registered users of any material changes
                  to this policy by email.
                </p>
              </section>

            </div>
          </main>

        </div>
      </div>

    </div>
  )
}
