export const PAY_PER_USE = {
  apt_contract: {
    id: 'apt_contract',
    name: 'APT Contract',
    description: 'Legally-reviewed tenancy agreement template',
    pricePence: 999,
    displayPrice: '£9.99',
    available: true,
  },
  section_13: {
    id: 'section_13',
    name: 'Section 13 Notice',
    description: 'Formal rent increase notice (RRA 2025 compliant)',
    pricePence: 499,
    displayPrice: '£4.99',
    available: false, // coming soon
  },
  dispute_pack: {
    id: 'dispute_pack',
    name: 'Dispute Evidence Pack',
    description: 'Evidence bundle for deposit disputes',
    pricePence: 2999,
    displayPrice: '£29.99',
    available: false, // coming soon
  },
} as const

export const PAY_PER_USE_LIST = Object.values(PAY_PER_USE)
