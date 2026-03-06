'use client'

import { useEffect } from 'react'
import * as CookieConsentLib from 'vanilla-cookieconsent'
// CSS imported in app/layout.tsx (before overrides) to guarantee cascade order

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
              { name: /^_clck/ },
              { name: /^_clsk/ },
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

      // Script loading handled by Analytics.tsx via cc:onConsent / cc:onChange events

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
                    'Google Analytics and Microsoft Clarity help us ' +
                    'understand how people use LetSorted so we can improve it. ' +
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
