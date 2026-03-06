import type { Metadata } from 'next'
import Footer from '@/components/shared/Footer'
import CrispChat from '@/components/shared/CrispChat'
import JsonLd from '@/components/shared/JsonLd'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://letsorted.co.uk'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'LetSorted — AI Tenant Screening for UK Landlords',
    template: '%s | LetSorted',
  },
  description:
    'Screen tenants with AI-powered financial analysis. Protect yourself from bad tenancies after Section 21 abolition. Built for UK self-managing landlords.',
  keywords: [
    'tenant screening UK',
    'landlord software UK',
    'tenant check',
    'renters rights act landlord',
    'tenant financial check',
    'section 21 abolished',
    'UK landlord app',
  ],
  authors: [{ name: 'LetSorted' }],
  creator: 'LetSorted',
  publisher: 'LetSorted',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: BASE_URL,
    siteName: 'LetSorted',
    title: 'LetSorted — AI Tenant Screening for UK Landlords',
    description:
      'Screen tenants with AI-powered financial analysis. Protect yourself from bad tenancies after Section 21 abolition.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LetSorted — AI Tenant Screening for UK Landlords',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LetSorted — AI Tenant Screening for UK Landlords',
    description:
      'Screen tenants with AI-powered financial analysis. Built for UK landlords.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'LetSorted',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    'AI-powered tenant screening and property management for UK landlords.',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GB',
  },
}

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'LetSorted',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '9.99',
    priceCurrency: 'GBP',
  },
  description:
    'AI-powered tenant screening for UK landlords. Screen tenants with bank statement analysis.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={softwareSchema} />
      {children}
      <Footer variant="marketing" />
      <CrispChat />
    </>
  )
}
