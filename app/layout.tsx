import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Suspense } from 'react'
import Analytics from '@/components/shared/Analytics'
import CookieConsent from '@/components/shared/CookieConsent'
import PostHogProvider from '@/components/shared/PostHogProvider'
import './globals.css'
import 'vanilla-cookieconsent/dist/cookieconsent.css'
import './cookie-consent-overrides.css'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'LetSorted',
  description: "UK landlord management built for the Renters' Rights Act 2025.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${font.className} antialiased`}>
        {children}
        <Analytics />
        <Suspense fallback={null}>
          <PostHogProvider />
        </Suspense>
        <CookieConsent />
      </body>
    </html>
  )
}
