'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect, useMemo } from 'react'

function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}`
}

// Typed helper for accessing Crisp on window without importing lib/
const win = typeof window !== 'undefined' ? window as unknown as { $crisp: unknown[]; CRISP_WEBSITE_ID: string } : null

export default function GlobalError({
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

  function openSupport() {
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID
    if (!websiteId) return

    if (!win) return
    const msg = `Hi, I encountered an error on LetSorted.\n\nReference: ${errorId}\nPage: ${window.location.pathname}\nTime: ${new Date().toISOString()}`

    // Inject Crisp if not already loaded
    if (!document.getElementById('crisp-script')) {
      win.$crisp = []
      win.CRISP_WEBSITE_ID = websiteId
      const script = document.createElement('script')
      script.src = 'https://client.crisp.chat/l.js'
      script.async = true
      script.id = 'crisp-script'
      document.head.appendChild(script)

      script.onload = () => {
        win.$crisp.push(['do', 'chat:open'])
        win.$crisp.push(['set', 'message:text', [msg]])
      }
    } else if (win.$crisp) {
      win.$crisp.push(['do', 'chat:open'])
      win.$crisp.push(['set', 'message:text', [msg]])
    }
  }

  return (
    <html>
      <body>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #111827; }
          .container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
          .card { max-width: 28rem; width: 100%; text-align: center; }
          .icon-wrap { width: 3.5rem; height: 3.5rem; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
          .icon-wrap svg { width: 1.75rem; height: 1.75rem; color: #ef4444; }
          h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
          .subtitle { font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem; }
          .ref { font-size: 0.75rem; color: #9ca3af; font-family: monospace; margin-bottom: 1.5rem; }
          .buttons { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
          .btn { font-size: 0.875rem; font-weight: 500; padding: 0.625rem 1.25rem; border-radius: 0.5rem; border: none; cursor: pointer; transition: background 0.15s; }
          .btn-primary { background: #16a34a; color: white; }
          .btn-primary:hover { background: #15803d; }
          .btn-secondary { background: white; color: #374151; border: 1px solid #e5e7eb; }
          .btn-secondary:hover { border-color: #d1d5db; }
        `}</style>
        <div className="container">
          <div className="card">
            <div className="icon-wrap">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1>Something went wrong</h1>
            <p className="subtitle">Our team has been notified. You can try refreshing or reach out to support.</p>
            <p className="ref">Reference: {errorId}</p>
            <div className="buttons">
              <button onClick={() => reset()} className="btn btn-primary">
                Refresh page
              </button>
              <button onClick={openSupport} className="btn btn-secondary">
                Talk to Support
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
