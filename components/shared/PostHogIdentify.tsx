'use client'

import { useEffect } from 'react'
import { getPostHogClient } from '@/lib/posthog'

export default function PostHogIdentify({ userId }: { userId: string }) {
  useEffect(() => {
    const posthog = getPostHogClient()
    if (posthog) {
      // Identify with UUID only — no PII
      posthog.identify(userId)
    }
  }, [userId])

  return null
}
