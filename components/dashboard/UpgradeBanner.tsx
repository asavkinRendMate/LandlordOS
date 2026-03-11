'use client'

import Link from 'next/link'

interface UpgradeBannerProps {
  subscriptionStatus: string
}

export default function UpgradeBanner({ subscriptionStatus }: UpgradeBannerProps) {
  if (subscriptionStatus !== 'PAST_DUE') return null

  return (
    <div className="bg-red-600 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm font-medium truncate">
            Your subscription payment failed. Update your payment method to avoid service interruption.
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="flex-shrink-0 bg-white text-red-600 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Update payment
        </Link>
      </div>
    </div>
  )
}
