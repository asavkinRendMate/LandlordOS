import * as Sentry from '@sentry/nextjs'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    ignoreErrors: [
      // Browser resize noise
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network aborts (user navigated away, slow connection)
      'AbortError',
      'Failed to fetch',
      'Load failed',
      'NetworkError',
      // Next.js client-side nav cancellation
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
    ],

    beforeSend(event) {
      // Only drop generic cross-origin "Script error."
      // with no stack — these have zero useful info
      const firstValue = event.exception?.values?.[0]
      if (
        firstValue?.value === 'Script error.' &&
        !firstValue.stacktrace?.frames?.length
      ) {
        return null
      }
      return event
    },
  })
}
