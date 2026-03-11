/**
 * templates/section-13-notice.ts — Statutory notice of rent increase.
 *
 * Similar austere style to section-8. No cover page, no green header.
 */

import type { Section13NoticeData } from '../types'
import {
  type RenderContext,
  createRenderContext,
  addPage,
  finalize,
  formatAddress,
  formatDate,
  formatPence,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_TOP,
  MARGIN_BOTTOM,
  CONTENT_WIDTH,
  COLORS,
  SPACING,
  TEXT_STYLES,
  drawText,
  drawRect,
  drawLine,
  ensureSpace,
} from '../renderer'
import { drawFooter } from '../components/footer'
import { drawPartyBlock } from '../components/party-block'
import { drawSignatureBlock } from '../components/signature-block'

export async function renderSection13Notice(data: Section13NoticeData): Promise<{ buffer: Buffer; pageCount: number }> {
  const ctx = await createRenderContext('Section 13 Notice', {
    drawHeader: false,
  })
  const styles = TEXT_STYLES(ctx.fonts)
  const address = formatAddress(data.property)

  // ── Statutory header ────────────────────────────────────────────────────

  ctx.cursorY = PAGE_HEIGHT - MARGIN_TOP - 10

  drawText(ctx,
    'Notice of Increase of Rent for a Periodic Assured Tenancy (other than a Statutory Periodic Tenancy)',
    { font: ctx.fonts.bold, size: 13, leading: 18, color: COLORS.textPrimary },
    { align: 'center' },
  )

  ctx.cursorY -= 8

  drawText(ctx,
    "Housing Act 1988 Section 13(2) as amended by the Renters' Rights Act 2025",
    { font: ctx.fonts.regular, size: 9, leading: 14, color: COLORS.textSecondary },
    { align: 'center' },
  )

  ctx.cursorY -= SPACING.sectionGap

  drawLine(ctx.currentPage, MARGIN_LEFT, ctx.cursorY, PAGE_WIDTH - MARGIN_RIGHT, ctx.cursorY, {
    color: COLORS.borderStrong, thickness: 1,
  })
  ctx.cursorY -= SPACING.sectionGap

  // ── Property and parties ────────────────────────────────────────────────

  drawText(ctx, 'Property', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.labelValueGap
  drawText(ctx, address, styles.body, {})
  ctx.cursorY -= SPACING.sectionGap

  drawText(ctx, 'Date of Service', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.labelValueGap
  drawText(ctx, formatDate(data.servedAt), styles.body, {})
  ctx.cursorY -= SPACING.sectionGap

  drawPartyBlock(ctx, data.landlord, { label: 'Landlord' })
  ctx.cursorY -= SPACING.sectionGap

  drawText(ctx, 'Tenant(s)', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.blockGap
  for (const tenant of data.tenants) {
    drawText(ctx, tenant.fullName, styles.body, {})
    drawText(ctx, tenant.email, { ...styles.body, color: COLORS.textSecondary }, {})
    ctx.cursorY -= SPACING.labelValueGap
  }

  // ── Rent increase details ──────────────────────────────────────────────

  ctx.cursorY -= SPACING.sectionGap

  drawText(ctx, 'Rent Increase Details', styles.title, {})
  ctx.cursorY -= SPACING.blockGap

  const currentRent = formatPence(data.currentRentPence)
  const proposedRent = formatPence(data.proposedRentPence)
  const diff = data.proposedRentPence - data.currentRentPence
  const pctChange = data.currentRentPence > 0
    ? ((diff / data.currentRentPence) * 100).toFixed(1)
    : '0.0'

  // Bordered box with light bg
  const boxHeight = 110
  ensureSpace(ctx, boxHeight + 20)
  const boxY = ctx.cursorY

  drawRect(ctx.currentPage, MARGIN_LEFT, boxY - boxHeight, CONTENT_WIDTH, boxHeight, {
    color: COLORS.brandGreenLight,
    borderColor: COLORS.borderDefault,
    borderWidth: 1,
  })

  // Current rent row
  ctx.currentPage.drawText('Current Monthly Rent', {
    x: MARGIN_LEFT + 16,
    y: boxY - 25,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })
  ctx.currentPage.drawText(currentRent, {
    x: MARGIN_LEFT + 260,
    y: boxY - 25,
    size: 16,
    font: ctx.fonts.bold,
    color: COLORS.textPrimary,
  })

  // Divider
  drawLine(ctx.currentPage, MARGIN_LEFT + 16, boxY - 45, MARGIN_LEFT + CONTENT_WIDTH - 16, boxY - 45, {
    color: COLORS.borderDefault,
  })

  // Proposed rent row
  ctx.currentPage.drawText('Proposed Monthly Rent', {
    x: MARGIN_LEFT + 16,
    y: boxY - 65,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })
  ctx.currentPage.drawText(proposedRent, {
    x: MARGIN_LEFT + 260,
    y: boxY - 65,
    size: 16,
    font: ctx.fonts.bold,
    color: COLORS.brandGreen,
  })

  // Difference
  ctx.currentPage.drawText(`Increase: ${formatPence(diff)} (+${pctChange}%)`, {
    x: MARGIN_LEFT + 16,
    y: boxY - 90,
    size: 9,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })

  ctx.currentPage.drawText(`Effective from: ${formatDate(data.effectiveDate)}`, {
    x: MARGIN_LEFT + 260,
    y: boxY - 90,
    size: 9,
    font: ctx.fonts.bold,
    color: COLORS.textPrimary,
  })

  ctx.cursorY = boxY - boxHeight - SPACING.sectionGap

  // ── Last increase date ─────────────────────────────────────────────────

  if (data.lastIncreaseDate) {
    drawText(ctx, `Last rent increase: ${formatDate(data.lastIncreaseDate)}`, styles.body, {})
    ctx.cursorY -= SPACING.blockGap
  }

  // ── Tribunal statement ─────────────────────────────────────────────────

  ctx.cursorY -= SPACING.blockGap
  drawText(ctx,
    'If you believe this increase is above the market rate, you may refer it to the First-tier Tribunal (Property Chamber) before the effective date.',
    styles.body,
    {},
  )
  ctx.cursorY -= SPACING.sectionGap

  // ── Signature ──────────────────────────────────────────────────────────

  drawSignatureBlock(ctx, data.landlordSignature, { label: 'Landlord' })

  // ── Plain border + footers ─────────────────────────────────────────────

  const totalPages = ctx.pages.length
  for (let i = 0; i < totalPages; i++) {
    const page = ctx.pages[i]
    drawRect(page, MARGIN_LEFT - 8, MARGIN_BOTTOM + 24, CONTENT_WIDTH + 16, PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - 16, {
      borderColor: COLORS.borderStrong,
      borderWidth: 0.5,
    })
    drawFooter(page, ctx.fonts, i + 1, totalPages)
  }

  return finalize(ctx)
}
