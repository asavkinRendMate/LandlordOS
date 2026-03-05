import type { Metadata } from 'next'
import Footer from '@/components/shared/Footer'

export const metadata: Metadata = {
  title: 'LetSorted — Your rentals, sorted.',
  description:
    'The simplest way to manage your rental properties. Tenants, documents, rent and compliance — all in one place. Built for UK self-managing landlords.',
  metadataBase: new URL('https://letsorted.co.uk'),
  openGraph: {
    title: 'LetSorted — Your rentals, sorted.',
    description:
      'The simplest way to manage your rental properties. Tenants, documents, rent and compliance — all in one place. Built for UK self-managing landlords.',
    url: 'https://letsorted.co.uk',
    siteName: 'LetSorted',
    locale: 'en_GB',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LetSorted — Your rentals, sorted.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LetSorted — Your rentals, sorted.',
    description:
      'The simplest way to manage your rental properties. Tenants, documents, rent and compliance — all in one place. Built for UK self-managing landlords.',
    images: ['/og-image.png'],
  },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer variant="marketing" />
    </>
  )
}
