/**
 * templates/inspection-report.ts — Property inspection condition report.
 *
 * Structure:
 * 1. Cover page — title, address, tenancy start, AGREED/DISPUTED badge
 * 2. Parties page — landlord + tenant, confirmation timestamps
 * 3. Per-room pages — room name, condition badge, notes, photo grid
 * 4. Confirmation page — sign-off statement, signature blocks
 */

import type { InspectionReportData } from '../types'
import {
  createRenderContext,
  addPage,
  finalize,
  formatAddress,
  formatDate,
  formatDateTime,
  MARGIN_LEFT,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_WIDTH,
  COLORS,
  SPACING,
  TEXT_STYLES,
  CONDITION_COLORS,
  drawText,
  drawRect,
} from '../renderer'
import { drawHeader } from '../components/header'
import { drawFooter } from '../components/footer'
import { drawPartyBlock } from '../components/party-block'
import { drawSignatureBlock } from '../components/signature-block'
import { drawPhotoGrid } from '../components/photo-grid'

export async function renderInspectionReport(data: InspectionReportData): Promise<{ buffer: Buffer; pageCount: number }> {
  const ctx = await createRenderContext('Property Inspection', {
    drawHeader: true,
    skipHeaderOnFirstPage: true,
  })
  const styles = TEXT_STYLES(ctx.fonts)
  const address = formatAddress(data.propertyAddress)

  // ── Page 1: Cover ───────────────────────────────────────────────────────

  // Green block top 220pt
  drawRect(ctx.currentPage, 0, PAGE_HEIGHT - 220, PAGE_WIDTH, 220, {
    color: COLORS.brandGreen,
  })

  // Title
  ctx.currentPage.drawText('Property Inspection', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 100,
    size: 24,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })

  // Address subtitle
  ctx.currentPage.drawText(address, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 130,
    size: 12,
    font: ctx.fonts.regular,
    color: COLORS.white,
  })

  // Tenancy start
  ctx.currentPage.drawText(`Tenancy start: ${formatDate(data.tenancyStartDate)}`, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 155,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.white,
  })

  // Status badge
  const badgeText = data.status === 'AGREED' ? 'AGREED' : 'DISPUTED'
  const badgeColor = data.status === 'AGREED' ? COLORS.successGreen : COLORS.warningAmber
  const badgeWidth = ctx.fonts.bold.widthOfTextAtSize(badgeText, 12) + 24
  drawRect(ctx.currentPage, MARGIN_LEFT, PAGE_HEIGHT - 195, badgeWidth, 28, {
    color: badgeColor,
  })
  ctx.currentPage.drawText(badgeText, {
    x: MARGIN_LEFT + 12,
    y: PAGE_HEIGHT - 188,
    size: 12,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })

  // Disputed banner
  if (data.status === 'DISPUTED') {
    const bannerY = PAGE_HEIGHT - 240
    drawRect(ctx.currentPage, MARGIN_LEFT, bannerY, CONTENT_WIDTH, 24, {
      color: COLORS.warningAmber,
    })
    ctx.currentPage.drawText('DISPUTED — Tenant has not agreed to this report', {
      x: MARGIN_LEFT + 12,
      y: bannerY + 7,
      size: 9,
      font: ctx.fonts.bold,
      color: COLORS.white,
    })
  }

  // Generated date below block
  const genY = data.status === 'DISPUTED' ? PAGE_HEIGHT - 280 : PAGE_HEIGHT - 250
  ctx.currentPage.drawText(`Generated: ${formatDate(data.generatedAt)}`, {
    x: MARGIN_LEFT,
    y: genY,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })

  // ── Page 2: Parties ──────────────────────────────────────────────────────

  addPage(ctx)

  drawText(ctx, 'Parties', styles.title, {})
  ctx.cursorY -= SPACING.sectionGap

  // Landlord
  drawPartyBlock(ctx, data.landlord, { label: 'Landlord' })
  drawText(ctx, `Confirmed: ${formatDateTime(data.landlordConfirmedAt)}`, {
    ...styles.caption,
    color: COLORS.successGreen,
  }, {})
  ctx.cursorY -= SPACING.sectionGap

  // Tenant
  drawPartyBlock(ctx, data.tenant, { label: 'Tenant' })
  if (data.tenantConfirmedAt) {
    drawText(ctx, `Confirmed: ${formatDateTime(data.tenantConfirmedAt)}`, {
      ...styles.caption,
      color: COLORS.successGreen,
    }, {})
  } else {
    drawText(ctx, 'Not yet confirmed', {
      ...styles.caption,
      color: COLORS.warningAmber,
    }, {})
  }

  // ── Room pages ──────────────────────────────────────────────────────────

  for (const room of data.rooms) {
    addPage(ctx)

    // Room heading
    drawText(ctx, room.name, styles.sectionHeading, {})
    ctx.cursorY -= 4

    // Floor
    if (room.floor) {
      drawText(ctx, room.floor, { ...styles.caption, color: COLORS.textMuted }, {})
    }

    // Condition badge
    const condColor = CONDITION_COLORS[room.condition] ?? COLORS.textMuted
    const condText = room.condition
    const condWidth = ctx.fonts.bold.widthOfTextAtSize(condText, 9) + 16
    const badgeY = ctx.cursorY
    drawRect(ctx.currentPage, MARGIN_LEFT, badgeY - 16, condWidth, 18, {
      color: condColor,
    })
    ctx.currentPage.drawText(condText, {
      x: MARGIN_LEFT + 8,
      y: badgeY - 12,
      size: 9,
      font: ctx.fonts.bold,
      color: COLORS.white,
    })
    ctx.cursorY -= 26

    // Notes
    if (room.landlordNotes) {
      ctx.cursorY -= SPACING.blockGap
      drawText(ctx, 'Landlord Notes', { ...styles.caption, color: COLORS.textMuted }, {})
      drawText(ctx, room.landlordNotes, styles.body, {})
    }

    if (room.tenantNotes) {
      ctx.cursorY -= SPACING.blockGap
      drawText(ctx, 'Tenant Notes', { ...styles.caption, color: COLORS.textMuted }, {})
      drawText(ctx, room.tenantNotes, styles.body, {})
    }

    // Photos — landlord first, then tenant
    if (room.photos.length > 0) {
      ctx.cursorY -= SPACING.sectionGap
      const landlordPhotos = room.photos.filter(p => p.uploadedBy === 'landlord')
      const tenantPhotos = room.photos.filter(p => p.uploadedBy === 'tenant')
      const sorted = [...landlordPhotos, ...tenantPhotos]

      await drawPhotoGrid(ctx, sorted)
    }
  }

  // ── Confirmation page ────────────────────────────────────────────────────

  addPage(ctx)

  if (data.status === 'AGREED') {
    drawText(
      ctx,
      'This report has been reviewed and confirmed by both parties.',
      styles.sectionHeading,
      {},
    )
  } else {
    drawText(ctx, 'Dispute Notice', styles.sectionHeading, {})
    ctx.cursorY -= SPACING.blockGap
    drawText(
      ctx,
      'The tenant has not agreed to the contents of this report.',
      styles.body,
      {},
    )
    if (data.disputeReason) {
      ctx.cursorY -= SPACING.blockGap
      drawText(ctx, 'Dispute Reason:', styles.subheading, {})
      drawText(ctx, data.disputeReason, styles.body, {})
    }
  }

  ctx.cursorY -= SPACING.sectionGap

  // Signature blocks
  drawSignatureBlock(ctx, {
    party: data.landlord,
    signedAt: data.landlordConfirmedAt,
  }, { label: 'Landlord' })

  ctx.cursorY -= SPACING.sectionGap

  drawSignatureBlock(ctx, {
    party: data.tenant,
    signedAt: data.tenantConfirmedAt,
  }, { label: 'Tenant' })

  // ── Headers and footers on all pages ─────────────────────────────────────

  const totalPages = ctx.pages.length
  for (let i = 0; i < totalPages; i++) {
    const page = ctx.pages[i]
    // Header on all pages except cover (page 0)
    if (i > 0) {
      drawHeader(page, ctx.fonts, 'Property Inspection', ctx.logoImage)
    }
    drawFooter(page, ctx.fonts, i + 1, totalPages)
  }

  return finalize(ctx)
}
