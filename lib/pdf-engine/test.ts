/**
 * lib/pdf-engine/test.ts — Generate sample PDFs for all templates.
 *
 * Usage:
 *   npx tsx lib/pdf-engine/test.ts                        # all templates
 *   npx tsx lib/pdf-engine/test.ts --template=inspection-report  # single template
 */

import { generatePDF } from './index'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type {
  InspectionReportData,
  ScreeningReportData,
  AptContractData,
  Section8NoticeData,
  Section13NoticeData,
  DisputePackData,
  CoverSheetData,
} from './types'

const OUT_DIR = '/tmp/pdf-test'
const PHOTO_URL = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'

// ── Test data ────────────────────────────────────────────────────────────────

const inspectionData: InspectionReportData = {
  reportId: 'ci-001',
  propertyAddress: {
    line1: 'Flat 4',
    line2: '12 Greenwood Terrace',
    town: 'London',
    county: 'Greater London',
    postcode: 'SE15 3QR',
  },
  tenancyStartDate: '2026-03-01',
  landlord: {
    fullName: 'Sarah Mitchell',
    email: 'sarah.mitchell@email.co.uk',
    phone: '07700 900123',
    address: {
      line1: '88 Victoria Road',
      town: 'Bromley',
      postcode: 'BR1 3PE',
    },
  },
  tenant: {
    fullName: 'Amir Patel',
    email: 'amir.patel@gmail.com',
    phone: '07911 234567',
  },
  rooms: [
    {
      name: 'Living Room',
      floor: 'Ground floor',
      condition: 'GOOD',
      landlordNotes: 'Freshly painted walls in eggshell white. New carpet fitted January 2026. Bay window in good working order.',
      tenantNotes: 'Agreed. Small mark on skirting board near radiator, noted for reference.',
      photos: [
        { url: PHOTO_URL, caption: 'Living room overview', takenAt: '2026-03-01T10:00:00Z', uploadedBy: 'landlord' },
        { url: PHOTO_URL, caption: 'Bay window', takenAt: '2026-03-01T10:05:00Z', uploadedBy: 'landlord' },
        { url: PHOTO_URL, caption: 'Skirting board mark', takenAt: '2026-03-01T14:00:00Z', uploadedBy: 'tenant' },
      ],
    },
    {
      name: 'Master Bedroom',
      floor: 'First floor',
      condition: 'GOOD',
      landlordNotes: 'Built-in wardrobe with sliding doors. Double-glazed window. Carpet in good condition.',
      photos: [
        { url: PHOTO_URL, caption: 'Bedroom from doorway', takenAt: '2026-03-01T10:15:00Z', uploadedBy: 'landlord' },
        { url: PHOTO_URL, caption: 'Wardrobe interior', takenAt: '2026-03-01T10:18:00Z', uploadedBy: 'landlord' },
      ],
    },
    {
      name: 'Kitchen',
      floor: 'Ground floor',
      condition: 'FAIR',
      landlordNotes: 'All appliances working. Some wear on worktop near sink. Extractor fan functional.',
      tenantNotes: 'Noted worktop wear. Oven door hinge slightly loose.',
      photos: [
        { url: PHOTO_URL, caption: 'Kitchen overview', takenAt: '2026-03-01T10:25:00Z', uploadedBy: 'landlord' },
        { url: PHOTO_URL, caption: 'Worktop wear', takenAt: '2026-03-01T10:28:00Z', uploadedBy: 'landlord' },
        { url: PHOTO_URL, caption: 'Oven hinge', takenAt: '2026-03-01T14:10:00Z', uploadedBy: 'tenant' },
      ],
    },
    {
      name: 'Bathroom',
      floor: 'First floor',
      condition: 'GOOD',
      landlordNotes: 'Tiles, grouting, and sealant all in good condition. Shower pressure tested and working.',
      photos: [
        { url: PHOTO_URL, caption: 'Bathroom overview', takenAt: '2026-03-01T10:35:00Z', uploadedBy: 'landlord' },
      ],
    },
  ],
  landlordConfirmedAt: '2026-03-01T16:00:00Z',
  tenantConfirmedAt: '2026-03-02T09:30:00Z',
  status: 'AGREED',
  generatedAt: '2026-03-02T10:00:00Z',
}

const screeningData: ScreeningReportData = {
  reportId: 'sr-001',
  generatedAt: '2026-03-10T14:30:00Z',
  propertyAddress: '27 Elm Grove, Flat 2, Manchester, M14 5RD',
  monthlyRentPence: 145000,
  isJointApplication: true,
  applicants: [
    {
      fullName: 'James Okonkwo',
      email: 'james.okonkwo@outlook.com',
      statementPeriodStart: '2025-12-01',
      statementPeriodEnd: '2026-02-28',
      nameVerified: true,
      averageMonthlyIncomePence: 285000,
      averageMonthlyOutgoingsPence: 192000,
    },
    {
      fullName: 'Priya Sharma',
      email: 'priya.sharma@gmail.com',
      statementPeriodStart: '2025-12-01',
      statementPeriodEnd: '2026-02-28',
      nameVerified: true,
      averageMonthlyIncomePence: 210000,
      averageMonthlyOutgoingsPence: 145000,
    },
  ],
  totalScore: 82,
  grade: 'B',
  categories: [
    {
      name: 'Affordability',
      score: 22,
      maxScore: 30,
      summary: 'Combined income comfortably covers the rent at 29% of gross income. Both applicants show consistent salary credits.',
      flags: [
        { rule: 'RENT_BELOW_30_PCT', severity: 'INFO', detail: 'Rent is 29% of combined gross income — within recommended threshold.' },
      ],
    },
    {
      name: 'Stability',
      score: 18,
      maxScore: 20,
      summary: 'Regular salary credits from established employers. No gaps in income over the 3-month period.',
      flags: [],
    },
    {
      name: 'Debt',
      score: 12,
      maxScore: 15,
      summary: 'One applicant has a personal loan repayment of £180/month. No other credit commitments identified.',
      flags: [
        { rule: 'LOAN_REPAYMENT', severity: 'INFO', detail: 'Personal loan repayment of £180/month detected for James Okonkwo.' },
      ],
    },
    {
      name: 'Gambling',
      score: 15,
      maxScore: 15,
      summary: 'No gambling transactions identified for either applicant.',
      flags: [],
    },
    {
      name: 'Liquidity',
      score: 8,
      maxScore: 10,
      summary: 'Average combined balance of £4,200 across the period. Sufficient buffer for rent obligations.',
      flags: [],
    },
    {
      name: 'Positive',
      score: 7,
      maxScore: 10,
      summary: 'Regular savings contributions noted. No overdraft usage.',
      flags: [
        { rule: 'REGULAR_SAVINGS', severity: 'INFO', detail: 'Monthly savings transfers detected for both applicants.' },
      ],
    },
  ],
  overallSummary: 'This joint application presents a strong financial profile. Combined income of approximately £4,950/month comfortably covers the monthly rent of £1,450. Both applicants show stable employment income with consistent patterns. One personal loan repayment noted but well within manageable limits. Recommended for approval.',
  verificationUrl: 'https://letsorted.co.uk/verify/abc123-def456-ghi789',
  unlockedBy: 'Sarah Mitchell',
}

const aptContractData: AptContractData = {
  contractId: 'apt-001',
  createdAt: '2026-02-20',
  tenancyStartDate: '2026-03-01',
  monthlyRentPence: 175000,
  rentDueDay: 1,
  depositPence: 175000,
  depositScheme: 'Deposit Protection Service (DPS)',
  depositReference: 'DPS-2026-44819',
  property: {
    line1: '15 Acacia Avenue',
    town: 'Leeds',
    county: 'West Yorkshire',
    postcode: 'LS6 2HG',
  },
  landlord: {
    party: {
      fullName: 'David Chen',
      email: 'david.chen@landlord.co.uk',
      phone: '07500 112233',
      address: {
        line1: '3 The Willows',
        town: 'Harrogate',
        county: 'North Yorkshire',
        postcode: 'HG1 4DD',
      },
    },
  },
  tenants: [
    {
      party: {
        fullName: 'Emma Williams',
        email: 'emma.w@email.com',
        phone: '07911 445566',
      },
    },
    {
      party: {
        fullName: 'Thomas Williams',
        email: 'tom.williams@email.com',
        phone: '07911 778899',
      },
    },
  ],
  clauses: [
    { heading: 'Rent', body: 'The tenant shall pay the rent of £1,750.00 per calendar month in advance on or before the 1st day of each month by standing order to the landlord\'s nominated bank account.' },
    { heading: 'Deposit', body: 'The deposit of £1,750.00 has been protected with the Deposit Protection Service (DPS) under reference DPS-2026-44819. The prescribed information has been provided to the tenant within 30 days of receipt.' },
    { heading: 'Use of Property', body: 'The property shall be used as a private dwelling only by the tenant and permitted occupiers named in this agreement. The tenant shall not use the property or allow it to be used for any business or commercial purpose.' },
    { heading: 'Repairs and Maintenance', body: 'The landlord shall keep in repair the structure and exterior of the dwelling, and keep in repair and proper working order the installations for the supply of water, gas, electricity, sanitation, and heating. The tenant shall keep the interior of the property in a clean and reasonable condition and report any disrepair promptly.' },
    { heading: 'Alterations', body: 'The tenant shall not make any alterations or additions to the property without the prior written consent of the landlord. Any approved alterations must be carried out in a professional manner and in compliance with building regulations.' },
    { heading: 'Insurance', body: 'The landlord shall insure the building. The tenant is responsible for insuring their own contents.' },
    { heading: 'Access', body: 'The landlord or their agent may enter the property at reasonable times of the day to inspect its condition or carry out repairs, having given at least 24 hours written notice except in an emergency.' },
    { heading: 'Ending the Tenancy', body: 'Either party may end this tenancy by giving at least two months\' notice in writing. The landlord may only recover possession through the court using the statutory grounds under the Housing Act 1988 as amended.' },
    { heading: 'Anti-social Behaviour', body: 'The tenant shall not cause, or allow household members or visitors to cause, nuisance or annoyance to neighbours or others in the locality.' },
    { heading: 'Pets', body: 'The tenant may keep pets at the property subject to the landlord\'s prior written consent, which shall not be unreasonably withheld. The tenant is responsible for any damage caused by pets.' },
  ],
  specialConditions: 'The landlord agrees to replace the kitchen boiler by 30 April 2026. The tenant has been granted permission to repaint the second bedroom in a neutral colour.',
  permittedOccupiers: ['Sophie Williams (child, age 8)'],
  petClause: 'One cat permitted with prior approval granted.',
}

const section8Data: Section8NoticeData = {
  noticeId: 's8-001',
  servedAt: '2026-03-10',
  possessionAfter: '2026-05-10',
  property: {
    line1: 'Flat 9',
    line2: 'Riverside Court',
    town: 'Birmingham',
    county: 'West Midlands',
    postcode: 'B1 1TT',
  },
  landlord: {
    fullName: 'Margaret Thompson',
    email: 'margaret.t@outlook.co.uk',
    phone: '07800 334455',
    address: {
      line1: '22 Priory Gardens',
      town: 'Solihull',
      postcode: 'B91 3EX',
    },
  },
  tenants: [
    {
      fullName: 'Kevin Marshall',
      email: 'k.marshall@email.com',
    },
  ],
  grounds: ['GROUND_8', 'GROUND_10', 'GROUND_11'],
  groundEvidence: {
    GROUND_8: 'The tenant has failed to pay rent for March, April, and May 2026, totalling £4,350.00. As of the date of this notice, at least two months\' rent remains unpaid.',
    GROUND_10: 'Rent of £1,450.00 for March 2026 became lawfully due on 1 March 2026 and remains unpaid as of 10 March 2026.',
    GROUND_11: 'The tenant has consistently paid rent late over the past 8 months. Rent was received after the due date in July, August, September, October, November 2025, and January and February 2026.',
  },
  arrearsAmountPence: 435000,
  arrearsCalculatedTo: '2026-03-10',
  landlordSignature: {
    party: {
      fullName: 'Margaret Thompson',
      email: 'margaret.t@outlook.co.uk',
    },
    signedAt: '2026-03-10T09:00:00Z',
  },
}

const section13Data: Section13NoticeData = {
  noticeId: 's13-001',
  servedAt: '2026-03-01',
  effectiveDate: '2026-05-01',
  property: {
    line1: '7 Oakfield Road',
    town: 'Bristol',
    postcode: 'BS8 2BJ',
  },
  landlord: {
    fullName: 'Robert Nguyen',
    email: 'robert.nguyen@property.co.uk',
    phone: '07711 998877',
    address: {
      line1: '15 College Green',
      town: 'Bristol',
      postcode: 'BS1 5TB',
    },
  },
  tenants: [
    {
      fullName: 'Hannah Clarke',
      email: 'hannah.clarke@email.com',
      phone: '07900 112233',
    },
  ],
  currentRentPence: 130000,
  proposedRentPence: 140000,
  lastIncreaseDate: '2025-05-01',
  landlordSignature: {
    party: {
      fullName: 'Robert Nguyen',
      email: 'robert.nguyen@property.co.uk',
    },
    signedAt: '2026-03-01T11:00:00Z',
  },
}

const disputePackData: DisputePackData = {
  packId: 'dp-001',
  generatedAt: '2026-03-11',
  property: {
    line1: '34 Wellington Street',
    line2: 'Flat 2A',
    town: 'London',
    county: 'Greater London',
    postcode: 'WC2E 7BD',
  },
  landlord: {
    fullName: 'Catherine O\'Brien',
    email: 'catherine.obrien@email.co.uk',
    phone: '07700 556677',
    address: {
      line1: '1 Hampstead Lane',
      town: 'London',
      postcode: 'NW3 7QR',
    },
  },
  tenant: {
    fullName: 'Daniel Kowalski',
    email: 'daniel.k@gmail.com',
    phone: '07911 223344',
  },
  tenancyStartDate: '2024-06-01',
  tenancyEndDate: '2026-02-28',
  depositPence: 230000,
  depositScheme: 'mydeposits',
  depositReference: 'MD-2024-77234',
  addressedTo: 'deposit_scheme',
  disputeSummary: 'The tenant vacated the property on 28 February 2026 at the end of a 20-month tenancy. Upon inspection, damage was found to the kitchen worktop, bathroom tiles, and living room carpet beyond fair wear and tear. The landlord seeks to deduct £1,480 from the deposit of £2,300 to cover repair costs. The tenant disputes the deductions, claiming the damage was pre-existing.',
  maintenanceTickets: [
    {
      id: 'mt-001',
      submittedAt: '2025-04-15T08:30:00Z',
      category: 'Damp & Mould',
      priority: 'URGENT',
      status: 'RESOLVED',
      description: 'Damp patch appearing on bedroom ceiling near window. Black mould developing.',
      resolvedAt: '2025-04-18T14:00:00Z',
      resolutionNotes: 'Ventilation improved, mould treated, ceiling repainted.',
      photos: [
        { url: PHOTO_URL, caption: 'Damp ceiling patch', takenAt: '2025-04-15T08:30:00Z', uploadedBy: 'tenant' },
        { url: PHOTO_URL, caption: 'After treatment', takenAt: '2025-04-18T14:00:00Z', uploadedBy: 'landlord' },
      ],
    },
    {
      id: 'mt-002',
      submittedAt: '2025-09-22T16:00:00Z',
      category: 'Plumbing',
      priority: 'HIGH',
      status: 'RESOLVED',
      description: 'Kitchen sink leaking under cabinet. Water damage to cupboard base.',
      resolvedAt: '2025-09-24T11:00:00Z',
      resolutionNotes: 'Pipe fitting replaced, cupboard base dried and sealed.',
      photos: [
        { url: PHOTO_URL, caption: 'Leak under sink', takenAt: '2025-09-22T16:00:00Z', uploadedBy: 'tenant' },
      ],
    },
    {
      id: 'mt-003',
      submittedAt: '2026-01-10T09:00:00Z',
      category: 'Heating',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      description: 'Radiator in hallway not heating up. May need bleeding or valve replacement.',
      resolvedAt: '2026-01-12T15:30:00Z',
      resolutionNotes: 'Radiator bled and thermostatic valve replaced.',
      photos: [],
    },
  ],
  rentHistory: [
    { dueDate: '2025-10-01', amountDuePence: 230000, amountPaidPence: 230000, status: 'RECEIVED', paidAt: '2025-10-01T09:00:00Z' },
    { dueDate: '2025-11-01', amountDuePence: 230000, amountPaidPence: 230000, status: 'RECEIVED', paidAt: '2025-11-01T09:00:00Z' },
    { dueDate: '2025-12-01', amountDuePence: 230000, amountPaidPence: 230000, status: 'LATE', paidAt: '2025-12-08T14:30:00Z' },
    { dueDate: '2026-01-01', amountDuePence: 230000, amountPaidPence: 230000, status: 'RECEIVED', paidAt: '2026-01-02T10:00:00Z' },
    { dueDate: '2026-02-01', amountDuePence: 230000, amountPaidPence: 200000, status: 'PARTIAL', paidAt: '2026-02-01T09:00:00Z' },
  ],
  documents: [
    { name: 'Gas Safety Certificate 2025', type: 'Gas Safety Certificate', uploadedAt: '2024-06-01', url: 'https://example.com/doc1' },
    { name: 'EPC Rating C', type: 'Energy Performance Certificate', uploadedAt: '2024-06-01', url: 'https://example.com/doc2' },
    { name: 'Check-In Report June 2024', type: 'Check-In Report', uploadedAt: '2024-06-01', url: 'https://example.com/doc3' },
    { name: 'Tenancy Agreement', type: 'Tenancy Agreement', uploadedAt: '2024-06-01', url: 'https://example.com/doc4' },
    { name: 'Deposit Certificate', type: 'Deposit Certificate', uploadedAt: '2024-06-15', url: 'https://example.com/doc5' },
    { name: 'How to Rent Guide', type: 'How to Rent', uploadedAt: '2024-06-01', url: 'https://example.com/doc6' },
  ],
  inspectionPhotos: [
    { url: PHOTO_URL, caption: 'Living room — inspection', takenAt: '2024-06-01T10:00:00Z', uploadedBy: 'landlord' },
    { url: PHOTO_URL, caption: 'Kitchen — inspection', takenAt: '2024-06-01T10:10:00Z', uploadedBy: 'landlord' },
    { url: PHOTO_URL, caption: 'Bathroom — inspection', takenAt: '2024-06-01T10:20:00Z', uploadedBy: 'landlord' },
  ],
  checkOutPhotos: [
    { url: PHOTO_URL, caption: 'Living room — check-out', takenAt: '2026-02-28T14:00:00Z', uploadedBy: 'landlord' },
    { url: PHOTO_URL, caption: 'Kitchen damage — check-out', takenAt: '2026-02-28T14:10:00Z', uploadedBy: 'landlord' },
    { url: PHOTO_URL, caption: 'Bathroom tiles — check-out', takenAt: '2026-02-28T14:20:00Z', uploadedBy: 'landlord' },
  ],
  eventLog: [
    { occurredAt: '2024-06-01T10:00:00Z', actor: 'landlord', description: 'Tenancy commenced. Check-in inspection completed.' },
    { occurredAt: '2024-06-15T12:00:00Z', actor: 'landlord', description: 'Deposit of £2,300.00 protected with mydeposits.' },
    { occurredAt: '2025-04-15T08:30:00Z', actor: 'tenant', description: 'Maintenance request submitted: damp and mould in bedroom.' },
    { occurredAt: '2025-04-18T14:00:00Z', actor: 'landlord', description: 'Damp and mould issue resolved — ventilation improved, mould treated.' },
    { occurredAt: '2025-09-22T16:00:00Z', actor: 'tenant', description: 'Maintenance request submitted: kitchen sink leak.' },
    { occurredAt: '2025-09-24T11:00:00Z', actor: 'landlord', description: 'Kitchen sink leak repaired.' },
    { occurredAt: '2025-12-08T14:30:00Z', actor: 'system', description: 'December rent received late (7 days overdue).' },
    { occurredAt: '2026-01-10T09:00:00Z', actor: 'tenant', description: 'Maintenance request: hallway radiator not heating.' },
    { occurredAt: '2026-02-01T09:00:00Z', actor: 'system', description: 'February rent: partial payment of £2,000 received (£300 short).' },
    { occurredAt: '2026-02-28T14:00:00Z', actor: 'landlord', description: 'Tenant vacated. Check-out inspection completed. Damage noted.' },
    { occurredAt: '2026-03-05T10:00:00Z', actor: 'landlord', description: 'Deposit deduction proposal of £1,480 sent to tenant.' },
    { occurredAt: '2026-03-08T16:00:00Z', actor: 'tenant', description: 'Tenant disputed deposit deductions.' },
  ],
}

const coverSheetData: CoverSheetData = {
  referenceId: 'LS-2026-A3F9K',
  generatedAt: '2026-03-11T14:30:00Z',
  propertyAddress: {
    line1: 'Flat 4',
    line2: '12 Greenwood Terrace',
    town: 'London',
    county: 'Greater London',
    postcode: 'SE15 3QR',
  },
  landlord: {
    fullName: 'Sarah Mitchell',
    email: 'sarah.mitchell@email.co.uk',
    phone: '07700 900123',
    address: {
      line1: '88 Victoria Road',
      town: 'Bromley',
      postcode: 'BR1 3PE',
    },
  },
  tenants: [
    {
      fullName: 'Amir Patel',
      email: 'amir.patel@gmail.com',
      phone: '07911 234567',
    },
  ],
  tenancyStartDate: '2026-03-01',
  documents: [
    { index: 1, title: 'Tenancy Agreement', description: 'Assured Periodic Tenancy under Housing Act 1988', status: 'uploaded' },
    { index: 2, title: 'Property Inventory & Schedule of Condition', description: 'Check-in report with photos — ref CI-2026-001', status: 'generated' },
    { index: 3, title: 'Gas Safety Certificate', status: 'uploaded' },
    { index: 4, title: 'Energy Performance Certificate (EPC)', status: 'uploaded' },
    { index: 5, title: 'How to Rent Guide', description: 'Gov.uk prescribed information booklet', status: 'uploaded' },
    { index: 6, title: 'Deposit Protection Certificate', status: 'pending' },
  ],
  acknowledgments: [
    {
      party: 'landlord',
      fullName: 'Sarah Mitchell',
      acknowledgedAt: '2026-03-11T14:25:00Z',
      ipAddress: '82.132.241.57',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  ],
  incorporationStatement:
    'The parties confirm that the Property Inventory and Schedule of Condition (Document 2) forms part of ' +
    'this tenancy agreement and is incorporated herein by mutual confirmation upon completion. The ' +
    'Check-in Report documents the condition of the property at the commencement of the tenancy and ' +
    'may be used as evidence in any future deposit dispute proceedings.',
}

// Variant: apt-contract with missing deposit scheme/reference (tests fallback text)
const aptContractNoDeposit: AptContractData = {
  ...aptContractData,
  depositScheme: undefined,
  depositReference: undefined,
}

// ── Runner ───────────────────────────────────────────────────────────────────

type TemplateName = 'inspection-report' | 'screening-report' | 'apt-contract' | 'apt-contract-no-deposit' | 'section-8-notice' | 'section-13-notice' | 'dispute-pack' | 'cover-sheet'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_TEMPLATES: Record<TemplateName, { template: TemplateName; data: any }> = {
  'inspection-report': { template: 'inspection-report', data: inspectionData },
  'screening-report': { template: 'screening-report', data: screeningData },
  'apt-contract': { template: 'apt-contract', data: aptContractData },
  'apt-contract-no-deposit': { template: 'apt-contract', data: aptContractNoDeposit },
  'section-8-notice': { template: 'section-8-notice', data: section8Data },
  'section-13-notice': { template: 'section-13-notice', data: section13Data },
  'dispute-pack': { template: 'dispute-pack', data: disputePackData },
  'cover-sheet': { template: 'cover-sheet', data: coverSheetData },
}

async function run() {
  mkdirSync(OUT_DIR, { recursive: true })

  // Parse --template arg
  const templateArg = process.argv.find(a => a.startsWith('--template='))
  const selectedTemplate = templateArg?.split('=')[1] as TemplateName | undefined

  const templatesToRun = selectedTemplate
    ? { [selectedTemplate]: ALL_TEMPLATES[selectedTemplate] }
    : ALL_TEMPLATES

  if (selectedTemplate && !ALL_TEMPLATES[selectedTemplate]) {
    console.error(`Unknown template: ${selectedTemplate}`)
    console.error(`Available: ${Object.keys(ALL_TEMPLATES).join(', ')}`)
    process.exit(1)
  }

  let passed = 0
  let failed = 0

  for (const [name, request] of Object.entries(templatesToRun)) {
    try {
      console.log(`Generating ${name}...`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await generatePDF(request as any)
      const outPath = join(OUT_DIR, `${name}.pdf`)
      writeFileSync(outPath, result.buffer)
      console.log(`  ✓ ${name} → ${outPath} (${result.pageCount} pages, ${(result.buffer.length / 1024).toFixed(1)}KB)`)
      passed++
    } catch (err) {
      const e = err as Record<string, unknown>
      console.error(`  ✗ ${name} FAILED:`, e.reason ?? e.message ?? err)
      if (e.originalError) {
        const orig = e.originalError as Record<string, unknown>
        console.error('    Original error:', orig.message ?? e.originalError)
      }
      failed++
    }
  }

  console.log(`\nDone: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
