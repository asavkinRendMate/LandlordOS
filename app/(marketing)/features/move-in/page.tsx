import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { UserCheck, Camera, ShieldCheck, Handshake } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tenant Move-In — Hassle-Free Onboarding',
  description:
    'Generate legally compliant tenancy agreements, collect e-signatures, and create timestamped inventory reports. Everything you need for a smooth move-in, done in minutes.',
}

export default function MoveInPage() {
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
            Move them in properly
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl">
            Tenancy agreements, e-signatures, and timestamped inventories — the entire move-in
            process handled in one place.
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
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 1</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Choose your tenant</h3>
                <p className="text-gray-500 leading-relaxed">
                  Once screening is done, select who gets the property. The other applicants
                  automatically receive a polite rejection email.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 2</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Run the check-in inspection</h3>
                <p className="text-gray-500 leading-relaxed">
                  Go room by room, add photos and condition notes. Your tenant reviews the same report
                  from their portal and confirms or raises a dispute.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 3</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Upload your compliance documents</h3>
                <p className="text-gray-500 leading-relaxed">
                  Gas Safety, EPC, EICR, and How to Rent guide. LetSorted tracks expiry dates and
                  alerts you before anything lapses.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Handshake className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 4</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Both parties confirm</h3>
                <p className="text-gray-500 leading-relaxed">
                  Tenancy is active, the clock starts, and everything is on record.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 border border-gray-200 rounded-xl p-6 bg-gray-50">
            <p className="text-gray-600 leading-relaxed">
              A timestamped photo inventory signed off by both parties is your strongest protection
              in a deposit dispute. LetSorted creates that paper trail automatically.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
