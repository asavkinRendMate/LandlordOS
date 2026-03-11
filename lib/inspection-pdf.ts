import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { prisma } from '@/lib/prisma'
import { getInspectionPhotoUrl } from '@/lib/inspection-storage'
import { createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { inspectionCompleteHtml } from '@/lib/email-templates'
import { env } from '@/lib/env'

const PAGE_W = 595.28 // A4 width in points
const PAGE_H = 841.89 // A4 height in points
const MARGIN = 50
const PHOTO_W = 240
const PHOTO_H = 160
const GAP = 15
const GREEN = rgb(0.086, 0.639, 0.290)

export async function generateInspectionPdf(inspectionId: string): Promise<void> {
  const inspection = await prisma.propertyInspection.findUnique({
    where: { id: inspectionId },
    include: {
      property: {
        select: { line1: true, line2: true, city: true, postcode: true, name: true },
        include: { user: { select: { name: true, email: true } } },
      },
      tenant: { select: { name: true, email: true } },
      photos: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!inspection) throw new Error('Inspection not found')

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const address = [inspection.property.line1, inspection.property.line2, inspection.property.city, inspection.property.postcode].filter(Boolean).join(', ')
  const landlordName = inspection.property.user?.name ?? inspection.property.user?.email ?? 'Landlord'
  const tenantName = inspection.tenant?.name ?? 'Tenant'

  // Cover page
  const coverPage = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - 100

  coverPage.drawText('Property Inspection', { x: MARGIN, y, font: fontBold, size: 28, color: GREEN })
  y -= 40
  coverPage.drawText(address, { x: MARGIN, y, font, size: 14, color: rgb(0.2, 0.2, 0.2) })
  y -= 60

  const details = [
    ['Landlord', landlordName],
    ['Tenant', tenantName],
    ['Date', new Date(inspection.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
    ['Landlord confirmed', inspection.landlordConfirmedAt ? new Date(inspection.landlordConfirmedAt).toLocaleDateString('en-GB') : 'Pending'],
    ['Tenant confirmed', inspection.tenantConfirmedAt ? new Date(inspection.tenantConfirmedAt).toLocaleDateString('en-GB') : 'Pending'],
    ['Status', inspection.status],
  ]

  for (const [label, value] of details) {
    coverPage.drawText(`${label}:`, { x: MARGIN, y, font: fontBold, size: 11, color: rgb(0.4, 0.4, 0.4) })
    coverPage.drawText(value, { x: MARGIN + 140, y, font, size: 11, color: rgb(0.1, 0.1, 0.1) })
    y -= 22
  }

  y -= 30
  coverPage.drawText(`Total photos: ${inspection.photos.length}`, { x: MARGIN, y, font, size: 11, color: rgb(0.4, 0.4, 0.4) })
  y -= 18
  const landlordPhotos = inspection.photos.filter((p) => p.uploadedBy === 'LANDLORD').length
  const tenantPhotos = inspection.photos.filter((p) => p.uploadedBy === 'TENANT').length
  coverPage.drawText(`By landlord: ${landlordPhotos}  |  By tenant: ${tenantPhotos}`, { x: MARGIN, y, font, size: 11, color: rgb(0.4, 0.4, 0.4) })

  // Group photos by room
  const roomGroups = new Map<string, { roomName: string; photos: typeof inspection.photos }>()
  for (const photo of inspection.photos) {
    const key = photo.roomId ?? photo.roomName
    if (!roomGroups.has(key)) {
      roomGroups.set(key, { roomName: photo.roomName, photos: [] })
    }
    roomGroups.get(key)!.photos.push(photo)
  }

  // Per-room pages
  for (const [, group] of Array.from(roomGroups)) {
    let page = pdf.addPage([PAGE_W, PAGE_H])
    y = PAGE_H - MARGIN

    page.drawText(group.roomName, { x: MARGIN, y, font: fontBold, size: 18, color: GREEN })
    y -= 30

    let col = 0
    for (const photo of group.photos) {
      // Check if we need a new page
      if (y - PHOTO_H - 30 < MARGIN) {
        page = pdf.addPage([PAGE_W, PAGE_H])
        y = PAGE_H - MARGIN
        col = 0
      }

      const x = MARGIN + col * (PHOTO_W + GAP)

      // Try to embed the photo
      try {
        const signedUrl = await getInspectionPhotoUrl(photo.fileUrl)
        const response = await fetch(signedUrl)
        const imageBytes = new Uint8Array(await response.arrayBuffer())

        let image
        if (photo.fileUrl.endsWith('.jpg') || photo.fileUrl.endsWith('.jpeg')) {
          image = await pdf.embedJpg(imageBytes)
        } else if (photo.fileUrl.endsWith('.png')) {
          image = await pdf.embedPng(imageBytes)
        } else {
          // Try JPEG first, fall back to PNG
          try {
            image = await pdf.embedJpg(imageBytes)
          } catch {
            image = await pdf.embedPng(imageBytes)
          }
        }

        const scale = Math.min(PHOTO_W / image.width, PHOTO_H / image.height)
        const drawW = image.width * scale
        const drawH = image.height * scale

        page.drawImage(image, {
          x,
          y: y - drawH,
          width: drawW,
          height: drawH,
        })
      } catch {
        // Draw placeholder if image can't be loaded
        page.drawRectangle({
          x,
          y: y - PHOTO_H,
          width: PHOTO_W,
          height: PHOTO_H,
          color: rgb(0.95, 0.95, 0.95),
        })
        page.drawText('Photo unavailable', {
          x: x + 60,
          y: y - PHOTO_H / 2,
          font,
          size: 10,
          color: rgb(0.6, 0.6, 0.6),
        })
      }

      // Condition + uploader label below photo
      const labelY = y - PHOTO_H - 14
      const condLabel = photo.condition === 'GOOD' ? 'Good' : photo.condition === 'MINOR_ISSUE' ? 'Minor issue' : photo.condition === 'DAMAGE' ? 'Damage' : ''
      const uploaderLabel = photo.uploadedBy === 'LANDLORD' ? 'Landlord' : 'Tenant'

      if (condLabel) {
        page.drawText(condLabel, { x, y: labelY, font, size: 9, color: rgb(0.4, 0.4, 0.4) })
      }
      page.drawText(uploaderLabel, { x: x + PHOTO_W - 40, y: labelY, font, size: 9, color: rgb(0.5, 0.5, 0.5) })

      if (photo.caption) {
        page.drawText(photo.caption.slice(0, 50), { x, y: labelY - 12, font, size: 8, color: rgb(0.5, 0.5, 0.5) })
      }

      col++
      if (col >= 2) {
        col = 0
        y -= PHOTO_H + 40
      }
    }
  }

  const pdfBytes = await pdf.save()

  // Upload to Supabase Storage
  const supabase = createServerClient()
  const storagePath = `inspection-reports/${inspectionId}/inspection-report.pdf`

  // Ensure documents bucket exists
  const { error: bucketError } = await supabase.storage.getBucket('documents')
  if (bucketError) {
    await supabase.storage.createBucket('documents', { public: false })
  }

  await supabase.storage.from('documents').upload(storagePath, pdfBytes, {
    contentType: 'application/pdf',
    upsert: true,
  })

  // Update inspection
  await prisma.propertyInspection.update({
    where: { id: inspectionId },
    data: {
      pdfUrl: storagePath,
      pdfGeneratedAt: new Date(),
    },
  })

  // Send completion email to tenant
  if (inspection.tenant?.email) {
    const { data: signedUrlData } = await supabase.storage.from('documents').createSignedUrl(storagePath, 60 * 60 * 24 * 7) // 7 day expiry
    const downloadUrl = signedUrlData?.signedUrl ?? `${env.NEXT_PUBLIC_APP_URL}/inspection/${inspection.token}`

    await sendEmail({
      to: inspection.tenant.email,
      subject: `Your property inspection report is ready — ${address}`,
      html: inspectionCompleteHtml({
        tenantName: inspection.tenant.name,
        propertyAddress: address,
        downloadUrl,
      }),
    })
  }
}
