import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Send, FileCheck, Unlock, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tenant Screening — Find Reliable Tenants',
  description:
    'AI-powered tenant screening for UK landlords. Verify income, check affordability, and flag risks from bank statements and references. One shareable application link per property.',
}

export default function TenantScreeningPage() {
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
            Find the right tenant
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl">
            AI-powered applicant screening that verifies income, checks affordability, and flags
            risks — so you can make confident decisions.
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
                  <Send className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 1</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Send an invite</h3>
                <p className="text-gray-500 leading-relaxed">
                  Paste your candidate&apos;s email, select the property and monthly rent. They get a
                  link to connect their bank account securely.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 2</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Candidate completes the check</h3>
                <p className="text-gray-500 leading-relaxed">
                  They upload or connect their bank statement. You get an email notification when the
                  analysis is ready.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Unlock className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 3</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Unlock the full report for &pound;15</h3>
                <p className="text-gray-500 leading-relaxed">
                  See a 0&ndash;100 reliability score, affordability rating, income verification, and a
                  plain-English summary of every risk factor.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">A note on screening expats and new arrivals</h3>
                <p className="text-gray-600 leading-relaxed">
                  Traditional referencing fails for expats, contractors, and recent arrivals — no UK
                  credit history, no employer reference. LetSorted screens based on actual bank
                  transactions: income patterns, spending behaviour, and affordability against the rent
                  asked. If the money is there, we&apos;ll show it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
