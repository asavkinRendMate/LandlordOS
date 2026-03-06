import type { Metadata } from 'next'
import ScreeningClient from './client'

export const metadata: Metadata = {
  title: 'Tenant Screening — AI Financial Check from £9.99',
  description:
    'AI-powered financial screening for prospective tenants. No subscription needed. Results in minutes. Built for UK landlords.',
  alternates: { canonical: '/screening' },
}

export default function ScreeningPage() {
  return <ScreeningClient />
}
