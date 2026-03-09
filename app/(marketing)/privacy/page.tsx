import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How LetSorted collects, uses, and protects your personal data.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/privacy' },
}

const sections = [
  { id: 'who-we-are',    title: '1. Who we are' },
  { id: 'what-we-collect', title: '2. What data we collect' },
  { id: 'how-we-use',    title: '3. How we use your data' },
  { id: 'ai-processing', title: '4. AI-powered financial analysis' },
  { id: 'cookies',       title: '5. Cookies' },
  { id: 'data-sharing',  title: '6. Data sharing' },
  { id: 'your-rights',   title: '7. Your rights' },
  { id: 'data-retention', title: '8. Data retention' },
  { id: 'changes',       title: '9. Changes to this policy' },
]

export default function PrivacyPage() {
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

      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-16">

          {/* Sidebar ToC */}
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
          <main className="min-w-0 max-w-[720px]">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
            <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

            <div className="space-y-12 text-gray-600 leading-relaxed">

              {/* 1. WHO WE ARE */}
              <section id="who-we-are">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Who we are</h2>
                <p>
                  LetSorted is a product of Rendmate Ltd (Company No. 14230492), registered in England
                  and Wales. We are committed to protecting your personal data in accordance with the UK
                  GDPR and the Data Protection Act 2018.
                </p>
                <address className="not-italic mt-4 space-y-1 text-gray-700 text-sm">
                  <p className="font-medium">Rendmate Ltd</p>
                  <p>167-169 Great Portland Street, London, England, W1W 5PF</p>
                  <p>ICO registration number: pending</p>
                  <p>
                    Contact:{' '}
                    <a href="mailto:privacy@letsorted.co.uk" className="text-green-700 hover:underline">
                      privacy@letsorted.co.uk
                    </a>
                  </p>
                </address>
              </section>

              {/* 2. WHAT DATA WE COLLECT */}
              <section id="what-we-collect">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. What data we collect</h2>

                <h3 className="font-semibold text-gray-800 mb-2">Account data</h3>
                <p className="mb-4">Email address and display name.</p>

                <h3 className="font-semibold text-gray-800 mb-2">Property data</h3>
                <p className="mb-4">Addresses, tenancy details, compliance documents, and related records you enter into the platform.</p>

                <h3 className="font-semibold text-gray-800 mb-2">Financial data</h3>
                <p className="mb-4">
                  Bank statements submitted by applicants for financial screening. These are processed
                  to generate a reliability score and are not stored after analysis is complete.
                </p>

                <h3 className="font-semibold text-gray-800 mb-2">Usage data</h3>
                <p className="mb-4">Pages visited, features used, and login timestamps.</p>

                <h3 className="font-semibold text-gray-800 mb-2">Communication data</h3>
                <p>Support chat messages, emails sent and received through the platform.</p>
              </section>

              {/* 3. HOW WE USE YOUR DATA */}
              <section id="how-we-use">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How we use your data</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>To provide the LetSorted service</li>
                  <li>To send transactional emails (sign-in codes, rent reminders, maintenance notifications)</li>
                  <li>To generate tenant reliability scores from bank statement analysis</li>
                  <li>To improve our service through analytics</li>
                  <li>To communicate with you about your account</li>
                </ul>
                <p className="mt-4 font-medium text-gray-700">
                  We do not sell your personal data. We do not use your data for advertising.
                </p>
              </section>

              {/* 4. AI-POWERED FINANCIAL ANALYSIS */}
              <section id="ai-processing">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. AI-powered financial analysis</h2>
                <p>
                  When you submit bank statements for financial screening, your documents are processed
                  by an AI system to generate a financial reliability score.
                </p>

                <h3 className="font-semibold text-gray-800 mt-5 mb-2">How it works</h3>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>
                    Bank statements are sent securely to Anthropic (USA) for AI-powered analysis
                  </li>
                  <li>
                    Data is processed under Standard Contractual Clauses (SCCs) to ensure GDPR-compliant
                    international data transfer
                  </li>
                  <li>
                    Statements are not retained by Anthropic after analysis is complete
                  </li>
                  <li>
                    Your bank statements are not used to train AI models
                  </li>
                  <li>
                    The AI extracts income patterns, balance history, and spending behaviour to produce
                    a score and summary
                  </li>
                  <li>
                    Scores are advisory only &mdash; all tenancy decisions are made by the landlord,
                    not automatically by the system
                  </li>
                </ul>

                <h3 className="font-semibold text-gray-800 mt-5 mb-2">Your rights</h3>
                <p>
                  You may withdraw consent at any time before submitting your application. Once analysis
                  is complete, you may request deletion of your financial score by contacting us at{' '}
                  <a href="mailto:privacy@letsorted.co.uk" className="text-green-700 hover:underline">
                    privacy@letsorted.co.uk
                  </a>.
                </p>
              </section>

              {/* 5. COOKIES */}
              <section id="cookies">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Cookies</h2>
                <p>
                  We use cookies for authentication, analytics, and marketing. Essential cookies
                  (authentication, consent management) are always active. Analytics and marketing
                  cookies are only loaded after you give consent via our cookie banner.
                </p>
                <p className="mt-3">
                  For full details, including a list of every cookie we use and how to manage your
                  preferences, see our{' '}
                  <Link href="/cookies" className="text-green-700 hover:underline font-medium">
                    Cookie Policy
                  </Link>.
                </p>
              </section>

              {/* 6. DATA SHARING */}
              <section id="data-sharing">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data sharing</h2>
                <p className="mb-4">We share data with the following third-party providers, solely to operate the service:</p>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li><strong>Supabase</strong> &mdash; database hosting and authentication (EU)</li>
                  <li><strong>Anthropic</strong> &mdash; AI-powered financial analysis (USA, SCCs in place)</li>
                  <li><strong>Resend</strong> &mdash; transactional email delivery</li>
                  <li><strong>Crisp</strong> &mdash; live chat support</li>
                  <li><strong>Google Analytics</strong> &mdash; website analytics (only with your consent)</li>
                  <li><strong>Meta / Facebook</strong> &mdash; marketing analytics (only with your consent)</li>
                  <li><strong>Vercel</strong> &mdash; application hosting</li>
                  <li><strong>Stripe</strong> &mdash; payment processing</li>
                </ul>
                <p className="mt-4 font-medium text-gray-700">We never sell your personal data.</p>
              </section>

              {/* 7. YOUR RIGHTS */}
              <section id="your-rights">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your rights under UK GDPR</h2>
                <p className="mb-3">You have the following rights regarding your personal data:</p>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li><strong>Right to access</strong> &mdash; request a copy of the data we hold about you</li>
                  <li><strong>Right to rectification</strong> &mdash; request that inaccurate data be corrected</li>
                  <li><strong>Right to erasure</strong> &mdash; request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
                  <li><strong>Right to data portability</strong> &mdash; receive your data in a portable format</li>
                  <li><strong>Right to object</strong> &mdash; object to processing of your data</li>
                  <li><strong>Right to withdraw consent</strong> &mdash; withdraw consent at any time where processing is based on consent</li>
                </ul>
                <p className="mt-4">
                  To exercise any of these rights, contact us at{' '}
                  <a href="mailto:privacy@letsorted.co.uk" className="text-green-700 hover:underline">
                    privacy@letsorted.co.uk
                  </a>.
                </p>
              </section>

              {/* 8. DATA RETENTION */}
              <section id="data-retention">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Data retention</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li><strong>Account data</strong> &mdash; retained while your account is active, deleted upon request</li>
                  <li><strong>Bank statements</strong> &mdash; deleted immediately after analysis completes</li>
                  <li><strong>Screening reports</strong> &mdash; retained for 12 months, then automatically deleted</li>
                  <li><strong>Support chat history</strong> &mdash; retained for 24 months</li>
                </ul>
              </section>

              {/* 9. CHANGES */}
              <section id="changes">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to this policy</h2>
                <p>
                  Last updated: March 2026. We will notify registered users of any material changes
                  to this policy by email.
                </p>
                <p className="mt-3">
                  If you have any questions, contact us at{' '}
                  <a href="mailto:privacy@letsorted.co.uk" className="text-green-700 hover:underline">
                    privacy@letsorted.co.uk
                  </a>.
                </p>
              </section>

            </div>
          </main>

        </div>
      </div>

    </div>
  )
}
