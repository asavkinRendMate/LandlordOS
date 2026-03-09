import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PoundSterling, Scale, FolderArchive } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Issue Management — Handle Problems Properly',
  description:
    'Generate Section 13 rent increase notices, export evidence packs for disputes, and track every maintenance request with a full audit trail. Be prepared when things go wrong.',
}

export default function IssueManagementPage() {
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
            Handle issues properly
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl">
            Rent increase notices, evidence packs, and full maintenance audit trails — everything
            you need when things don&apos;t go to plan.
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
                  <PoundSterling className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 1</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">Section 13 rent increase</h3>
                <p className="text-gray-500 leading-relaxed">
                  Under the Renters&apos; Rights Act, rent can only be increased once per year using a
                  Section 13 notice. LetSorted generates the notice, tracks the timeline, and records
                  everything so you can prove you followed the process.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5 text-green-600" />
                </div>
                <div className="w-px flex-1 bg-gray-200 mt-3" />
              </div>
              <div className="pb-2">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 2</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  Section 8 — regaining possession
                  <span className="ml-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full align-middle">
                    Coming soon
                  </span>
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  When you need your property back, LetSorted will help you serve a Section 8 notice
                  using the correct grounds. Every step is logged with timestamps so you have a clear
                  record if it reaches the tribunal.
                </p>
              </div>
            </div>

            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <FolderArchive className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Step 3</p>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">
                  Dispute evidence pack
                  <span className="ml-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full align-middle">
                    Coming soon
                  </span>
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  One-click export of your full paper trail — maintenance history, payment records,
                  communications, and photos — ready for a tribunal or deposit dispute. No more
                  scrambling through emails and folders.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 border border-gray-200 rounded-xl p-6 bg-gray-50">
            <p className="text-gray-600 leading-relaxed">
              Section 21 &ldquo;no-fault&rdquo; evictions are abolished from 2026. Every possession
              case now requires grounds and evidence. LetSorted builds that evidence as you go — so
              you&apos;re never caught off guard.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
