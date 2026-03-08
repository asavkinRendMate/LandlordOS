import posthog from 'posthog-js'

export function getPostHogClient() {
  if (typeof window === 'undefined') return null

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  if (!posthog.__loaded) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      capture_pageview: false, // We capture manually via Next.js router
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    })
  }

  return posthog
}
