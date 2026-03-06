'use client'

// Where to get each ID:
// GA:       analytics.google.com
// FB Pixel: business.facebook.com/events-manager
// Clarity:  clarity.microsoft.com

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

// ── Loaders (idempotent — safe to call multiple times) ───────────────────────

function loadGA() {
  if (!GA_ID || document.getElementById('ga-script')) return

  const script = document.createElement('script')
  script.id = 'ga-script'
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  script.async = true
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA_ID, { anonymize_ip: true })

  if (isDev) console.log('[analytics] GA loaded')
}

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

// ── Consent handler ──────────────────────────────────────────────────────────

function handleConsent() {
  const analyticsOk = acceptedCategory('analytics')
  const marketingOk = acceptedCategory('marketing')

  if (analyticsOk) {
    loadGA()
    loadClarity()
  } else if (isDev) {
    console.log('[analytics] No analytics consent — skipping GA & Clarity')
  }

  if (marketingOk) {
    loadFBPixel()
  } else if (isDev) {
    console.log('[analytics] No marketing consent — skipping FB Pixel')
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  // Listen for consent events
  useEffect(() => {
    // Check existing consent (returning visitors who already accepted)
    handleConsent()

    // Listen for new / changed consent
    document.addEventListener('cc:onConsent', handleConsent)
    document.addEventListener('cc:onChange', handleConsent)

    return () => {
      document.removeEventListener('cc:onConsent', handleConsent)
      document.removeEventListener('cc:onChange', handleConsent)
    }
  }, [])

  // Track route changes for FB Pixel
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
