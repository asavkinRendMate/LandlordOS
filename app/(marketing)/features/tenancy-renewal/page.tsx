import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tenancy Renewal — Start Again Stress-Free',
  description:
    'End tenancies cleanly with check-out inspections, deposit handling, and one-click vacancy reset. Open applications for your next tenant and start the cycle again.',
}

export default function TenancyRenewalPage() {
  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} />
          </Link>
          <a
            href="/#waitlist"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Join the waitlist
          </a>
        </div>
      </nav>

      <section className="py-20 px-6 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-[1280px] mx-auto">
          <Link
            href="/"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-8 inline-block"
          >
            &larr; Back to home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Start again, stress-free
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl">
            Check-out inspections, deposit handling, and vacancy reset — close one chapter and open
            the next with confidence.
          </p>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-[1280px] mx-auto">
          <div
            className="rounded-xl aspect-video max-w-4xl mx-auto flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #E8F0EB 0%, #D4E6D9 100%)',
              border: '1px solid rgba(45,106,79,0.1)',
            }}
          >
            <span className="text-lg text-[#16a34a]/40 font-medium">
              [ Detailed feature content coming soon ]
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
