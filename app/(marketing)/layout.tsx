import type { Metadata } from 'next'
import Footer from '@/components/shared/Footer'
import CrispChat from '@/components/shared/CrispChat'
import JsonLd from '@/components/shared/JsonLd'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://letsorted.co.uk'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'LetSorted — Property Management for UK Landlords',
    template: '%s | LetSorted',
  },
  description:
    'The only UK property management platform that builds your legal evidence trail automatically. Contracts, inspections, rent records and dispute packs — everything you need if a tenancy goes wrong.',
  keywords: [
    'property management UK',
    'landlord software UK',
    'tenant screening UK',
    'renters rights act landlord',
    'section 21 abolished',
    'landlord evidence trail',
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
    title: 'LetSorted — Property Management for UK Landlords',
    description:
      'The only UK property management platform that builds your legal evidence trail automatically. Contracts, inspections, rent records and dispute packs.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LetSorted — Property Management for UK Landlords',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LetSorted — Property Management for UK Landlords',
    description:
      'The only UK property management platform that builds your legal evidence trail automatically.',
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
    'Property management platform that builds your legal evidence trail automatically. Built for UK landlords.',
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
    'Property management for UK landlords. Contracts, inspections, rent records and dispute packs — builds your legal evidence trail automatically.',
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
