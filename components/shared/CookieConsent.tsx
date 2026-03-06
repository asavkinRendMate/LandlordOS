'use client'

import { useEffect } from 'react'
import * as CookieConsentLib from 'vanilla-cookieconsent'
// CSS imported in app/layout.tsx (before overrides) to guarantee cascade order

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

// ── GA loader ────────────────────────────────────────────────────────────────

function loadGoogleAnalytics() {
  if (document.getElementById('ga-script')) return
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID
  if (!GA_ID) return

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
  gtag('config', GA_ID)
}

function unloadGoogleAnalytics() {
  // Cookies are cleared by autoClear config above.
  // Script removal handled on next page load.
}

// ── FB Pixel loader ──────────────────────────────────────────────────────────

function loadFacebookPixel() {
  const FB_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID
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
}

function unloadFacebookPixel() {
  // Cookies cleared by autoClear config above.
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CookieConsent() {
  useEffect(() => {
    CookieConsentLib.run({
      guiOptions: {
        consentModal: {
          layout: 'bar',
          position: 'bottom',
          equalWeightButtons: false,
          flipButtons: false,
        },
        preferencesModal: {
          layout: 'box',
        },
      },

      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        analytics: {
          enabled: false,
          autoClear: {
            cookies: [
              { name: /^_ga/ },
              { name: '_gid' },
              { name: '_gat' },
            ],
          },
        },
        marketing: {
          enabled: false,
          autoClear: {
            cookies: [
              { name: '_fbp' },
              { name: '_fbc' },
            ],
          },
        },
      },

      onConsent: () => {
        if (CookieConsentLib.acceptedCategory('analytics')) {
          loadGoogleAnalytics()
        }
        if (CookieConsentLib.acceptedCategory('marketing')) {
          loadFacebookPixel()
        }
      },

      onChange: ({ changedCategories }) => {
        if (changedCategories.includes('analytics')) {
          if (CookieConsentLib.acceptedCategory('analytics')) {
            loadGoogleAnalytics()
          } else {
            unloadGoogleAnalytics()
          }
        }
        if (changedCategories.includes('marketing')) {
          if (CookieConsentLib.acceptedCategory('marketing')) {
            loadFacebookPixel()
          } else {
            unloadFacebookPixel()
          }
        }
      },

      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title: 'We use cookies',
              description:
                'We use essential cookies to keep you signed in, ' +
                'and optional cookies for analytics and marketing. ' +
                'You can choose what to accept.',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Necessary only',
              showPreferencesBtn: 'Manage preferences',
              footer:
                '<a href="/privacy">Privacy Policy</a> · ' +
                '<a href="/cookies">Cookie Policy</a>',
            },
            preferencesModal: {
              title: 'Cookie preferences',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Necessary only',
              savePreferencesBtn: 'Save preferences',
              closeIconLabel: 'Close',
              sections: [
                {
                  title: 'Necessary cookies',
                  description:
                    'These cookies are required for the site to work. ' +
                    'They handle sign-in and essential functionality.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Analytics cookies',
                  description:
                    'Google Analytics helps us understand how people ' +
                    'use LetSorted so we can improve it. ' +
                    'No personal data is sold.',
                  linkedCategory: 'analytics',
                },
                {
                  title: 'Marketing cookies',
                  description:
                    'Facebook Pixel helps us measure the effectiveness ' +
                    'of our ads so we only show relevant promotions.',
                  linkedCategory: 'marketing',
                },
                {
                  title: 'More information',
                  description:
                    'Questions? Contact us at ' +
                    '<a href="mailto:privacy@letsorted.co.uk">' +
                    'privacy@letsorted.co.uk</a>.',
                },
              ],
            },
          },
        },
      },
    })
  }, [])

  return null
}
