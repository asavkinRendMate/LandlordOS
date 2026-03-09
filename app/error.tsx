'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect, useMemo } from 'react'
import { generateErrorId, openCrispWithError } from '@/lib/crisp-support'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const errorId = useMemo(() => {
    return Sentry.lastEventId() || generateErrorId()
  }, [])

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6">
          Our team has been notified. You can try refreshing or reach out to support.
        </p>
        <p className="text-xs text-gray-400 mb-6 font-mono">Reference: {errorId}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Refresh page
          </button>
          <button
            onClick={() => openCrispWithError(errorId)}
            className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Talk to Support
          </button>
        </div>
      </div>
    </div>
  )
}
