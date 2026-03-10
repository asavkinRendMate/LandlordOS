'use client'

// Google Analytics with Consent Mode v2
// ──────────────────────────────────────
// GA loads UNCONDITIONALLY — Consent Mode v2 handles gating internally:
//   1. On page load: gtag('consent', 'default', { analytics_storage: 'denied', ... })
//      → GA loads but only collects anonymous/modelled data (GDPR-compliant)
//   2. On cookie consent "analytics" accepted: gtag('consent', 'update', { analytics_storage: 'granted' })
//   3. On cookie consent "marketing" accepted: gtag('consent', 'update', { ad_storage: 'granted', ... })
//
// FB Pixel and Clarity do NOT support consent mode — loaded only after consent.
//
// Where to get each ID:
//   GA:       analytics.google.com
//   FB Pixel: business.facebook.com/events-manager
//   Clarity:  clarity.microsoft.com

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { acceptedCategory } from 'vanilla-cookieconsent'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
    fbq: ((...args: unknown[]) => void) & { queue: unknown[] }
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const FB_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID

const isDev = process.env.NODE_ENV === 'development'

// ── GA: Consent Mode v2 ─────────────────────────────────────────────────────

/** Initialise dataLayer + gtag function, set consent defaults, then load the GA script. */
function initGA() {
  if (!GA_ID) {
    if (isDev) console.log('[analytics] NEXT_PUBLIC_GA_ID is not set — skipping GA')
    return
  }

  if (document.getElementById('ga-script')) return

  // 1. Bootstrap gtag before the script loads so consent defaults are queued first
  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  }
  window.gtag = gtag

  // 2. Consent Mode v2 defaults — all denied until user interacts with banner.
  //    GA still loads and models anonymous traffic (cookieless pings).
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  })

  // 3. Queue js + config commands BEFORE loading the script so the entire
  //    dataLayer is ready when gtag.js processes the queue on load.
  //    Without the config call GA defers all hits indefinitely.
  gtag('js', new Date())
  gtag('config', GA_ID)

  // 4. Load the gtag.js script — processes the dataLayer queue above on load
  const script = document.createElement('script')
  script.id = 'ga-script'
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  script.async = true
  document.head.appendChild(script)

  if (isDev) console.log(`[analytics] GA loaded (${GA_ID}) with Consent Mode v2 (defaults: denied)`)
}

/** Update GA consent state based on current cookie preferences. */
function updateGAConsent() {
  if (!GA_ID || !window.gtag) return

  const analyticsOk = acceptedCategory('analytics')
  const marketingOk = acceptedCategory('marketing')

  if (analyticsOk) {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
    })
    if (isDev) console.log('[analytics] GA consent update: analytics_storage → granted')
  }

  if (marketingOk) {
    window.gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
    if (isDev) console.log('[analytics] GA consent update: ad_storage → granted')
  }
}

// ── FB Pixel (no consent mode — loaded only after marketing consent) ─────────

function loadFBPixel() {
  if (!FB_ID || document.getElementById('fb-pixel')) return

  const script = document.createElement('script')
  script.id = 'fb-pixel'
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${FB_ID}');
    fbq('track', 'PageView');
  `
  document.head.appendChild(script)

  if (isDev) console.log('[analytics] FB Pixel loaded')
}

// ── Clarity (no consent mode — loaded only after analytics consent) ──────────

function loadClarity() {
  if (!CLARITY_ID || document.getElementById('clarity-script')) return

  const script = document.createElement('script')
  script.id = 'clarity-script'
  script.innerHTML = `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${CLARITY_ID}");
  `
  document.head.appendChild(script)

  if (isDev) console.log('[analytics] Clarity loaded')
}

// ── Consent handler (called on banner interaction + on mount for returning users) ──

function handleConsent() {
  // GA consent mode update (analytics + marketing)
  updateGAConsent()

  // Clarity — consent-gated (no consent mode support)
  if (acceptedCategory('analytics')) {
    loadClarity()
  } else if (isDev) {
    console.log('[analytics] No analytics consent — skipping Clarity')
  }

  // FB Pixel — consent-gated (no consent mode support)
  if (acceptedCategory('marketing')) {
    loadFBPixel()
  } else if (isDev) {
    console.log('[analytics] No marketing consent — skipping FB Pixel')
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  // Initialise GA unconditionally, then listen for consent events
  useEffect(() => {
    // GA loads immediately with consent defaults (denied) — Consent Mode v2
    initGA()

    // Check existing consent (returning visitors who already accepted)
    handleConsent()

    // Listen for new / changed consent
    // vanilla-cookieconsent v3 dispatches on window (global dispatchEvent), not document
    window.addEventListener('cc:onConsent', handleConsent)
    window.addEventListener('cc:onChange', handleConsent)

    return () => {
      window.removeEventListener('cc:onConsent', handleConsent)
      window.removeEventListener('cc:onChange', handleConsent)
    }
  }, [])

  // Track SPA route changes for FB Pixel
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      if (window.fbq) {
        window.fbq('track', 'PageView')
      }
    }
  }, [pathname])

  return null
}
