import type { Metadata } from 'next'
import PackagesClient from './client'

export const metadata: Metadata = {
  title: 'Screening Pricing — Credit Packs from £11.99',
  description:
    'Simple, transparent pricing for tenant screening. Single checks or bulk credit packs. No subscription required.',
  alternates: { canonical: '/screening/packages' },
}

export default function PackagesPage() {
  return <PackagesClient />
}
