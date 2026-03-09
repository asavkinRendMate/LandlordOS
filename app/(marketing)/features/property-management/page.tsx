import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Bell, PoundSterling, Wrench, Droplets } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Property Management — Stay on Top Effortlessly',
  description:
    'Automatic rent tracking, maintenance ticket system with photos, compliance certificate alerts, and a tenant portal. Simple tools to manage your rental property without the chaos.',
}

export default function PropertyManagementPage() {
  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 py-3 md:px-6 md:py-0 md:h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-icon.svg" alt="LetSorted" width={32} height={32} className="md:hidden" />
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="hidden md:block" />
          </Link>
          <a
            href="/#waitlist"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm transition-colors"
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
            Manage without the chaos
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl">
            Rent tracking, maintenance tickets, compliance alerts, and a tenant portal — everything
            running smoothly in one dashboard.
          </p>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-10">How it works</h2>

          <div className="space-y-10">
            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 1</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Document expiry alerts</h3>
                <p className="text-gray-500 leading-relaxed">
                  Gas Safety, EICR, EPC and Right to Rent checks have expiry dates. LetSorted tracks
                  them all and emails you before they lapse — before you become non-compliant.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <PoundSterling className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 2</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Rent tracking</h3>
                <p className="text-gray-500 leading-relaxed">
                  Mark payments received, flag late payments, and see the full payment history at a
                  glance. Partial payments are supported.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 3</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Maintenance requests</h3>
                <p className="text-gray-500 leading-relaxed">
                  Tenants submit issues with photos through their portal. You see priority, status,
                  and a full audit trail of every update. Every interaction is logged with timestamps
                  — useful if a dispute ever reaches a tribunal.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 4</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Awaab&apos;s Law compliance</h3>
                <p className="text-gray-500 leading-relaxed">
                  Damp and mould reports automatically trigger a 24-hour response timer, keeping you
                  compliant with the new private rental rules effective from 2026.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 border border-gray-200 rounded-xl p-6 bg-gray-50">
            <p className="text-gray-600 leading-relaxed">
              The Renters&apos; Rights Act 2025 introduces 15 new offences with fines up to
              &pound;40,000. LetSorted keeps the paper trail that proves you acted — and acted in time.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
