import { generatePDF } from '@/lib/pdf-engine'
import type { InspectionReportData, PDFPhoto } from '@/lib/pdf-engine/types'
import { prisma } from '@/lib/prisma'
import { getInspectionPhotoUrl } from '@/lib/inspection-storage'

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

export async function buildPeriodicInspectionPDF(_reportId: string): Promise<Buffer> {
  throw new Error('buildPeriodicInspectionPDF not yet implemented — see lib/pdf-engine/AGENT.md')
}

export async function buildScreeningReportPDF(_reportId: string): Promise<Buffer> {
  throw new Error('buildScreeningReportPDF not yet implemented — see lib/pdf-engine/AGENT.md')
}

export async function buildAptContractPDF(_contractId: string): Promise<Buffer> {
  throw new Error('buildAptContractPDF not yet implemented — see lib/pdf-engine/AGENT.md')
}

export async function buildSection8PDF(_noticeId: string): Promise<Buffer> {
  throw new Error('buildSection8PDF not yet implemented — see lib/pdf-engine/AGENT.md')
}

export async function buildSection13PDF(_noticeId: string): Promise<Buffer> {
  throw new Error('buildSection13PDF not yet implemented — see lib/pdf-engine/AGENT.md')
}

export async function buildDisputePackPDF(_packId: string): Promise<Buffer> {
  throw new Error('buildDisputePackPDF not yet implemented — see lib/pdf-engine/AGENT.md')
}
