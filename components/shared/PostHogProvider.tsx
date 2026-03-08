'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { acceptedCategory } from 'vanilla-cookieconsent'
import { getPostHogClient } from '@/lib/posthog'

export default function PostHogProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prevUrl = useRef('')

  // Initialise PostHog and enable session recording only after analytics consent
  useEffect(() => {
    function handleConsent() {
      const analyticsOk = acceptedCategory('analytics')
      const posthog = getPostHogClient()
      if (!posthog) return

      if (analyticsOk) {
        // Enable session recording after consent
        posthog.opt_in_capturing()
        if (!posthog.sessionRecordingStarted()) {
          posthog.startSessionRecording()
        }
      } else {
        // Disable tracking if consent revoked
        posthog.opt_out_capturing()
      }
    }

    // Check existing consent (returning visitors)
    handleConsent()

    // Listen for new / changed consent
    document.addEventListener('cc:onConsent', handleConsent)
    document.addEventListener('cc:onChange', handleConsent)

    return () => {
      document.removeEventListener('cc:onConsent', handleConsent)
      document.removeEventListener('cc:onChange', handleConsent)
    }
  }, [])

  // Capture pageviews on route change
  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    if (url === prevUrl.current) return
    prevUrl.current = url

    const posthog = getPostHogClient()
    if (posthog && !posthog.has_opted_out_capturing()) {
      posthog.capture('$pageview', { $current_url: window.location.origin + url })
    }
  }, [pathname, searchParams])

  return null
}
