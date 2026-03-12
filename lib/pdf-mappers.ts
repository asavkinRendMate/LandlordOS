import { generatePDF } from '@/lib/pdf-engine'
import type { InspectionReportData, PDFPhoto, AptContractData, AptClause, CoverSheetData } from '@/lib/pdf-engine/types'
import { prisma } from '@/lib/prisma'
import { getInspectionPhotoUrl } from '@/lib/inspection-storage'
import { PDFDocument } from 'pdf-lib'

/**
 * Maps a PropertyInspection from the database → InspectionReportData payload,
 * then calls generatePDF. Returns the raw PDF buffer.
 */
export async function buildInspectionPDF(reportId: string): Promise<Buffer> {
  const report = await prisma.propertyInspection.findUnique({
    where: { id: reportId },
    include: {
      property: {
        include: { user: { select: { name: true, email: true } } },
      },
      tenant: { select: { name: true, email: true, phone: true } },
      photos: {
        orderBy: { createdAt: 'asc' },
        include: { room: true },
      },
    },
  })

  if (!report) throw new Error(`PropertyInspection ${reportId} not found`)

  // Build room map from photos
  const roomMap = new Map<string, {
    name: string
    floor?: string
    photos: PDFPhoto[]
  }>()

  for (const photo of report.photos) {
    const key = photo.roomId ?? photo.roomName
    if (!roomMap.has(key)) {
      roomMap.set(key, {
        name: photo.roomName,
        floor: photo.room?.floor != null ? `Floor ${photo.room.floor}` : undefined,
        photos: [],
      })
    }

    const signedUrl = await getInspectionPhotoUrl(photo.fileUrl)

    roomMap.get(key)!.photos.push({
      url: signedUrl,
      caption: photo.caption ?? undefined,
      takenAt: (photo.takenAt ?? photo.createdAt).toISOString(),
      uploadedBy: photo.uploadedBy === 'LANDLORD' ? 'landlord' : 'tenant',
    })
  }

  const landlordName = report.property.user?.name ?? report.property.user?.email ?? 'Landlord'
  const landlordEmail = report.property.user?.email ?? ''

  const data: InspectionReportData = {
    reportId: report.id,
    propertyAddress: {
      line1: report.property.line1,
      line2: report.property.line2 ?? undefined,
      town: report.property.city,
      postcode: report.property.postcode,
    },
    tenancyStartDate: report.createdAt.toISOString().split('T')[0],
    landlord: {
      fullName: landlordName,
      email: landlordEmail,
    },
    tenant: {
      fullName: report.tenant?.name ?? 'Tenant',
      email: report.tenant?.email ?? '',
    },
    rooms: Array.from(roomMap.values()).map((room) => ({
      name: room.name,
      floor: room.floor,
      condition: 'GOOD' as const, // Default — photos have individual conditions
      photos: room.photos,
    })),
    landlordConfirmedAt: report.landlordConfirmedAt?.toISOString() ?? '',
    tenantConfirmedAt: report.tenantConfirmedAt?.toISOString() ?? undefined,
    status: report.status === 'AGREED' ? 'AGREED' : 'DISPUTED',
    generatedAt: new Date().toISOString().split('T')[0],
  }

  const result = await generatePDF({ template: 'inspection-report', data })
  return result.buffer
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function buildPeriodicInspectionPDF(_reportId: string): Promise<Buffer> {
  throw new Error('buildPeriodicInspectionPDF not yet implemented — see lib/pdf-engine/AGENT.md')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function buildScreeningReportPDF(_reportId: string): Promise<Buffer> {
  throw new Error('buildScreeningReportPDF not yet implemented — see lib/pdf-engine/AGENT.md')
}

/**
 * Generates an APT (Assured Periodic Tenancy) contract PDF.
 * Fetches tenancy data from DB, builds standard UK APT clauses, calls pdf-engine.
 */
export async function buildAptContractPDF(tenancyId: string): Promise<Buffer> {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      property: {
        include: { user: { select: { name: true, email: true } } },
      },
      tenant: { select: { name: true, email: true, phone: true } },
      contract: { select: { id: true } },
    },
  })

  if (!tenancy) throw new Error(`Tenancy ${tenancyId} not found`)
  if (!tenancy.tenant) throw new Error(`Tenancy ${tenancyId} has no tenant`)

  const landlord = tenancy.property.user
  const landlordName = landlord?.name ?? landlord?.email ?? 'Landlord'
  const landlordEmail = landlord?.email ?? ''

  const clauses: AptClause[] = APT_STANDARD_CLAUSES

  const data: AptContractData = {
    contractId: tenancy.contract?.id ?? tenancyId,
    createdAt: new Date().toISOString().split('T')[0],
    tenancyStartDate: tenancy.startDate?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
    monthlyRentPence: tenancy.monthlyRent ?? 0,
    rentDueDay: tenancy.paymentDay ?? 1,
    depositPence: tenancy.depositAmount ?? 0,
    depositScheme: tenancy.depositScheme ?? undefined,
    depositReference: tenancy.depositRef ?? undefined,
    property: {
      line1: tenancy.property.line1,
      line2: tenancy.property.line2 ?? undefined,
      town: tenancy.property.city,
      postcode: tenancy.property.postcode,
    },
    landlord: {
      party: { fullName: landlordName, email: landlordEmail },
    },
    tenants: [
      {
        party: {
          fullName: tenancy.tenant.name,
          email: tenancy.tenant.email,
          phone: tenancy.tenant.phone ?? undefined,
        },
      },
    ],
    clauses,
  }

  const result = await generatePDF({ template: 'apt-contract', data })
  return result.buffer
}

/**
 * Generates a cover sheet and prepends it to an uploaded PDF.
 * Returns the combined PDF buffer.
 */
export async function buildCoverSheetPDF(tenancyId: string, uploadedPdfBuffer: Buffer): Promise<Buffer> {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      property: {
        include: { user: { select: { name: true, email: true } } },
      },
      tenant: { select: { name: true, email: true, phone: true } },
    },
  })

  if (!tenancy) throw new Error(`Tenancy ${tenancyId} not found`)
  if (!tenancy.tenant) throw new Error(`Tenancy ${tenancyId} has no tenant`)

  const landlord = tenancy.property.user
  const landlordName = landlord?.name ?? landlord?.email ?? 'Landlord'
  const landlordEmail = landlord?.email ?? ''

  const data: CoverSheetData = {
    referenceId: `LS-${new Date().getFullYear()}-${tenancyId.slice(-5).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    propertyAddress: {
      line1: tenancy.property.line1,
      line2: tenancy.property.line2 ?? undefined,
      town: tenancy.property.city,
      postcode: tenancy.property.postcode,
    },
    landlord: { fullName: landlordName, email: landlordEmail },
    tenants: [
      {
        fullName: tenancy.tenant.name,
        email: tenancy.tenant.email,
        phone: tenancy.tenant.phone ?? undefined,
      },
    ],
    tenancyStartDate: tenancy.startDate?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
    documents: [
      { index: 1, title: 'LetSorted Cover Sheet', status: 'generated' },
      { index: 2, title: 'Tenancy Agreement (uploaded)', status: 'uploaded' },
    ],
    acknowledgments: [],
    incorporationStatement:
      'The parties confirm that the documents listed above, together with this cover sheet, form the complete tenancy agreement pack. Both parties should retain a copy for their records.',
  }

  const coverResult = await generatePDF({ template: 'cover-sheet', data })

  // Merge cover sheet + uploaded PDF using pdf-lib
  const mergedPdf = await PDFDocument.create()
  const coverDoc = await PDFDocument.load(coverResult.buffer)
  const uploadedDoc = await PDFDocument.load(uploadedPdfBuffer)

  const coverPages = await mergedPdf.copyPages(coverDoc, coverDoc.getPageIndices())
  for (const page of coverPages) mergedPdf.addPage(page)

  const uploadedPages = await mergedPdf.copyPages(uploadedDoc, uploadedDoc.getPageIndices())
  for (const page of uploadedPages) mergedPdf.addPage(page)

  const mergedBytes = await mergedPdf.save()
  return Buffer.from(mergedBytes)
}

// ── Standard APT Clauses (pre-approved UK template) ─────────────────────────

const APT_STANDARD_CLAUSES: AptClause[] = [
  {
    heading: '1. Parties',
    body: 'This agreement is between the Landlord and Tenant(s) named on the first page of this document.',
  },
  {
    heading: '2. Property',
    body: 'The Landlord lets the Property to the Tenant for use as a private dwelling.',
  },
  {
    heading: '3. Type of Tenancy',
    body: 'This is an Assured Periodic Tenancy under the Housing Act 1988 (as amended by the Renters\' Rights Act 2025). It is a rolling monthly tenancy with no fixed end date.',
  },
  {
    heading: '4. Rent',
    body: 'The Tenant shall pay the rent monthly in advance on the day specified. Payment should be made by bank transfer unless otherwise agreed.',
  },
  {
    heading: '5. Deposit',
    body: 'The deposit must be protected in a government-approved tenancy deposit scheme within 30 days of receipt. The Landlord must provide the Tenant with prescribed information about the deposit protection.',
  },
  {
    heading: '6. Tenant Obligations',
    body: 'The Tenant shall:\n- Pay rent on time\n- Keep the property in a clean and reasonable condition\n- Report any damage or need for repair promptly\n- Not make alterations without the Landlord\'s written consent\n- Not cause nuisance or annoyance to neighbours\n- Allow the Landlord reasonable access for inspections and repairs with at least 24 hours\' written notice',
  },
  {
    heading: '7. Landlord Obligations',
    body: 'The Landlord shall:\n- Keep the structure and exterior of the property in repair\n- Keep installations for water, gas, electricity, sanitation, heating, and hot water in repair and working order\n- Provide a Gas Safety Certificate, EPC, EICR, and How to Rent guide before the tenancy begins\n- Give at least 24 hours\' written notice before entering the property\n- Respond to damp and mould reports within 24 hours (Awaab\'s Law)',
  },
  {
    heading: '8. Ending the Tenancy',
    body: 'Either party may end this tenancy by giving at least 2 months\' written notice. The Landlord may only seek possession using the grounds specified in the Housing Act 1988 (as amended). Section 21 "no-fault" evictions are abolished under the Renters\' Rights Act 2025.',
  },
  {
    heading: '9. Rent Increases',
    body: 'The Landlord may increase the rent no more than once every 12 months by serving a Section 13 notice giving at least 2 months\' notice. The Tenant may challenge the increase by applying to the First-tier Tribunal.',
  },
  {
    heading: '10. Pets',
    body: 'The Tenant may request to keep a pet. The Landlord must not unreasonably refuse consent, in accordance with the Renters\' Rights Act 2025.',
  },
  {
    heading: '11. Data Protection',
    body: 'Both parties agree that personal data provided under this agreement will be processed in accordance with UK GDPR and the Data Protection Act 2018.',
  },
  {
    heading: '12. Governing Law',
    body: 'This agreement shall be governed by and construed in accordance with the laws of England and Wales.',
  },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function buildSection8PDF(_noticeId: string): Promise<Buffer> {
  throw new Error('buildSection8PDF not yet implemented — see lib/pdf-engine/AGENT.md')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function buildSection13PDF(_noticeId: string): Promise<Buffer> {
  throw new Error('buildSection13PDF not yet implemented — see lib/pdf-engine/AGENT.md')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function buildDisputePackPDF(_packId: string): Promise<Buffer> {
  throw new Error('buildDisputePackPDF not yet implemented — see lib/pdf-engine/AGENT.md')
}
