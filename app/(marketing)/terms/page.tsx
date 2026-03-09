import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using LetSorted, operated by Rendmate Ltd.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/terms' },
}

const sections = [
  { id: 'about',          title: '1. About LetSorted' },
  { id: 'service',        title: '2. The service' },
  { id: 'your-account',   title: '3. Your account' },
  { id: 'acceptable-use', title: '4. Acceptable use' },
  { id: 'payments',       title: '5. Subscription and payments' },
  { id: 'data',           title: '6. Data and documents' },
  { id: 'liability',      title: '7. Limitation of liability' },
  { id: 'termination',    title: '8. Termination' },
  { id: 'governing-law',  title: '9. Governing law' },
  { id: 'contact',        title: '10. Contact' },
]

export default function TermsPage() {
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
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">Terms of Service</h1>
            <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

            <div className="space-y-12 text-gray-600 leading-relaxed">

              <section id="about">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. About LetSorted</h2>
                <p>
                  LetSorted is operated by Rendmate Ltd (Company No. 14230492), registered in England and Wales.
                  By using LetSorted you agree to these terms. If you do not agree, please do not use the service.
                </p>
              </section>

              <section id="service">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. The service</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>LetSorted provides tools to help landlords manage rental properties</li>
                  <li>We are a software platform, not a letting agency or law firm</li>
                  <li>We do not provide legal advice</li>
                  <li>
                    Document templates are provided for convenience — you are responsible for ensuring
                    they meet your specific legal requirements
                  </li>
                </ul>
              </section>

              <section id="your-account">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Your account</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>You must provide accurate information when registering</li>
                  <li>You are responsible for maintaining the security of your account</li>
                  <li>
                    We use one-time code authentication — keep your email account secure, as it is your
                    method of access
                  </li>
                  <li>One account per person</li>
                </ul>
              </section>

              <section id="acceptable-use">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable use</h2>
                <p className="mb-3">You must not use LetSorted to:</p>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>Store false or misleading information about tenants</li>
                  <li>Harass or discriminate against tenants or applicants</li>
                  <li>Violate any UK law, including the Renters&apos; Rights Act 2025</li>
                  <li>Attempt to access other users&apos; data</li>
                </ul>
              </section>

              <section id="payments">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Subscription and payments</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>Free tier: 1 property, no time limit</li>
                  <li>Paid tier: £10/month per property for 2 or more properties</li>
                  <li>One-time charges: as listed on our pricing page</li>
                  <li>All payments are processed by Stripe</li>
                  <li>No refunds on one-time charges once a document has been generated</li>
                  <li>Subscriptions can be cancelled at any time from your account settings</li>
                </ul>
              </section>

              <section id="data">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data and documents</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>You retain ownership of all data and documents you upload to LetSorted</li>
                  <li>
                    You grant Rendmate Ltd a licence to store and process your data solely in order
                    to provide the service
                  </li>
                  <li>
                    We will not access your documents except for technical support purposes, and
                    only with your explicit permission
                  </li>
                </ul>
              </section>

              <section id="liability">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Limitation of liability</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>LetSorted is provided &ldquo;as is&rdquo; without warranties of any kind</li>
                  <li>
                    Rendmate Ltd is not liable for any losses arising from your use of the platform,
                    including loss of data, missed legal deadlines, or tenancy disputes
                  </li>
                  <li>
                    Our maximum liability to you is limited to the total amount you paid to us in
                    the three months preceding the claim
                  </li>
                </ul>
              </section>

              <section id="termination">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Termination</h2>
                <ul className="list-disc list-outside ml-5 space-y-1.5">
                  <li>You can delete your account at any time from Settings</li>
                  <li>
                    We reserve the right to suspend or terminate accounts that violate these
                    terms, without prior notice
                  </li>
                </ul>
              </section>

              <section id="governing-law">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Governing law</h2>
                <p>
                  These terms are governed by the laws of England and Wales. Any disputes will be
                  subject to the exclusive jurisdiction of the courts of England and Wales.
                </p>
              </section>

              <section id="contact">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact</h2>
                <p>For questions about these terms, please contact us:</p>
                <address className="not-italic mt-3 space-y-1 text-gray-700">
                  <p className="font-medium">Rendmate Ltd</p>
                  <p>167–169 Great Portland Street, London, England, W1W 5PF</p>
                  <a href="mailto:hello@letsorted.co.uk" className="text-green-700 hover:underline">
                    hello@letsorted.co.uk
                  </a>
                </address>
              </section>

            </div>
          </main>

        </div>
      </div>

    </div>
  )
}
