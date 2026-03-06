'use client'

import * as CookieConsentLib from 'vanilla-cookieconsent'

export default function ManageCookiesButton() {
  return (
    <button
      type="button"
      onClick={() => CookieConsentLib.showPreferences()}
      className="bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
    >
      Update cookie preferences
    </button>
  )
}
