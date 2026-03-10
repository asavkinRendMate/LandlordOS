'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ScreeningLayout from '@/components/screening-flow/ScreeningLayout'
import ScreeningCard from '@/components/screening-flow/ScreeningCard'

function SentContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'the candidate'
  const name = searchParams.get('name') || ''

  return (
    <ScreeningLayout>
      <div className="text-center mb-6">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite sent!</h1>
        <p className="text-gray-500 text-base mb-8">
          We&apos;ve emailed <span className="font-semibold text-gray-700">{email}</span>
          {name && <> ({name})</>} with a link to complete their financial check.
        </p>
      </div>

      {/* Status tracker */}
      <ScreeningCard className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">What happens next</p>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-gray-900 text-sm font-medium">Invite sent</p>
              <p className="text-gray-400 text-xs">Email delivered to {email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-gray-400 text-xs font-bold">2</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Candidate uploads statements</p>
              <p className="text-gray-400 text-xs">They click the link and upload their PDFs</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-gray-400 text-xs font-bold">3</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">You get notified</p>
              <p className="text-gray-400 text-xs">We&apos;ll email you when the report is ready</p>
            </div>
          </div>
        </div>
      </ScreeningCard>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/screening"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors text-center"
        >
          Send another invite
        </Link>
        <Link
          href="/screening/invites"
          className="border border-gray-300 text-gray-700 hover:border-gray-400 font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors text-center"
        >
          View all invites
        </Link>
      </div>
    </ScreeningLayout>
  )
}

export default function SentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f7f2] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SentContent />
    </Suspense>
  )
}
