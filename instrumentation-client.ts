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
      // Drop events with no useful stack trace
      if (
        event.exception?.values?.length === 1 &&
        !event.exception.values[0].stacktrace?.frames?.length
      ) {
        return null
      }
      return event
    },
  })
}
