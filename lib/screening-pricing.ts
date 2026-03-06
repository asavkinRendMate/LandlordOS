import { ScreeningPackageType } from '@prisma/client'

export interface StandalonePackage {
  type: ScreeningPackageType
  label: string
  credits: number
  pricePence: number
  priceDisplay: string
  perCheckDisplay: string
  savings?: string
}

export const STANDALONE_PACKAGES: StandalonePackage[] = [
  {
    type: 'SINGLE',
    label: 'Single',
    credits: 1,
    pricePence: 1199,
    priceDisplay: '£11.99',
    perCheckDisplay: '£11.99',
  },
  {
    type: 'TRIPLE',
    label: 'Triple',
    credits: 3,
    pricePence: 1999,
    priceDisplay: '£19.99',
    perCheckDisplay: '£6.66',
    savings: 'Save 44%',
  },
  {
    type: 'SIXER',
    label: 'Sixer',
    credits: 6,
    pricePence: 2999,
    priceDisplay: '£29.99',
    perCheckDisplay: '£5.00',
    savings: 'Save 58%',
  },
  {
    type: 'TEN',
    label: 'Ten Pack',
    credits: 10,
    pricePence: 3999,
    priceDisplay: '£39.99',
    perCheckDisplay: '£4.00',
    savings: 'Save 67%',
  },
]

// Subscriber (Pro plan) screening pricing
export const SUBSCRIBER_PRICING = {
  firstCheckPence: 999,
  firstCheckDisplay: '£9.99',
  additionalCheckPence: 149,
  additionalCheckDisplay: '£1.49',
} as const
