import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ClipboardCheck, Landmark, RotateCcw } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tenancy Renewal — Start Again Stress-Free',
  description:
    'End tenancies cleanly with check-out inspections, deposit handling, and one-click vacancy reset. Open applications for your next tenant and start the cycle again.',
}

export default function TenancyRenewalPage() {
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
            Start again, stress-free
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl">
            Check-out inspections, deposit handling, and vacancy reset — close one chapter and open
            the next with confidence.
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
                  <ClipboardCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 1</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  Run the check-out inspection
                  <span className="ml-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full align-middle">
                    Coming soon
                  </span>
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  Compare the property&apos;s current condition against the original check-in report.
                  Photo-by-photo, room-by-room — any new damage is flagged automatically, giving you
                  a clear basis for deposit deductions.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 2</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Handle the deposit</h3>
                <p className="text-gray-500 leading-relaxed">
                  LetSorted shows you the deposit amount, protection scheme, and reference number in
                  one place. If deductions are needed, the check-out evidence is already prepared and
                  timestamped.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 3</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">One click back to vacant</h3>
                <p className="text-gray-500 leading-relaxed">
                  End the tenancy and reset the property to vacant. Open applications for the next
                  tenant and the whole cycle starts again — screening, move-in, and management, all
                  in one place.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 border border-gray-200 rounded-xl p-6 bg-gray-50">
            <p className="text-gray-600 leading-relaxed">
              Most deposit disputes come down to evidence. A timestamped check-in and check-out
              report, signed off by both parties, is your strongest defence. LetSorted creates both
              automatically.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
