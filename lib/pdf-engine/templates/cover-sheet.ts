/**
 * templates/cover-sheet.ts — Tenancy Documentation Pack cover sheet.
 *
 * Single-page document prepended to a landlord-uploaded tenancy agreement PDF.
 * Contains: reference block, property/parties, documents list with status pills,
 * incorporation statement, and acknowledgment records with IP/timestamps.
 */

import type { CoverSheetData } from '../types'
import {
  type TextStyle,
  createRenderContext,
  finalize,
  formatAddress,
  formatDate,
  formatDateTime,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  COLORS,
  SPACING,
  drawText,
  drawTextRaw,
  drawRect,
  measureText,
} from '../renderer'
import { drawHeader } from '../components/header'
import { drawFooter } from '../components/footer'
import { rgb } from 'pdf-lib'

// ── Cover-sheet specific colours ────────────────────────────────────────────

const CS_COLORS = {
  amberBg: rgb(255 / 255, 251 / 255, 235 / 255),       // #FFFBEB
  amberBorder: rgb(252 / 255, 211 / 255, 77 / 255),     // #FCD34D
  amberText: rgb(146 / 255, 64 / 255, 14 / 255),        // #92400E
  altRowBg: rgb(249 / 255, 250 / 255, 251 / 255),       // #F9FAFB
  pillGreenBg: rgb(220 / 255, 252 / 255, 231 / 255),    // #DCFCE7 (green-100)
  pillGreenText: rgb(21 / 255, 128 / 255, 61 / 255),    // #15803D (green-700)
  pillGrayBg: rgb(243 / 255, 244 / 255, 246 / 255),     // #F3F4F6 (gray-100)
  pillGrayText: rgb(107 / 255, 114 / 255, 128 / 255),   // #6B7280 (gray-500)
}

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'INCLUDED',
  generated: 'INCLUDED',
  pending: 'TO BE ADDED',
}

export async function renderCoverSheet(data: CoverSheetData): Promise<{ buffer: Buffer; pageCount: number }> {
  const ctx = await createRenderContext('Tenancy Documentation Pack', {
    drawHeader: true,
    skipHeaderOnFirstPage: false,
  })
  const address = formatAddress(data.propertyAddress)

  // ── Reference block (right-aligned, grey text) ────────────────────────────

  const refY = ctx.cursorY
  const refStyle: TextStyle = { font: ctx.fonts.regular, size: 8, leading: 12, color: COLORS.textMuted }
  const refText = `Ref: ${data.referenceId}`
  const genText = `Generated: ${formatDateTime(data.generatedAt)}`
  const refWidth = measureText(refText, refStyle.font, refStyle.size)
  const genWidth = measureText(genText, refStyle.font, refStyle.size)
  const rightEdge = MARGIN_LEFT + CONTENT_WIDTH

  drawTextRaw(ctx.currentPage, refText, rightEdge - refWidth, refY, refStyle)
  drawTextRaw(ctx.currentPage, genText, rightEdge - genWidth, refY - 12, refStyle)

  // ── Main title ────────────────────────────────────────────────────────────

  drawText(ctx, 'Tenancy Documentation Pack', { font: ctx.fonts.bold, size: 11, leading: 16, color: COLORS.textPrimary }, {})
  ctx.cursorY -= SPACING.blockGap

  // ── Property + Parties block (two-column, light bg + border) ──────────────

  const blockY = ctx.cursorY
  const blockPadding = 10
  const colWidth = (CONTENT_WIDTH - blockPadding) / 2

  // Measure content height to draw box
  const landlordLines = [
    'Landlord',
    data.landlord.fullName,
    data.landlord.email,
    ...(data.landlord.phone ? [data.landlord.phone] : []),
  ]
  const tenantLines: string[] = []
  for (let i = 0; i < data.tenants.length; i++) {
    const label = data.tenants.length > 1 ? `Tenant ${i + 1}` : 'Tenant'
    tenantLines.push(label)
    tenantLines.push(data.tenants[i].fullName)
    tenantLines.push(data.tenants[i].email)
    if (data.tenants[i].phone) tenantLines.push(data.tenants[i].phone!)
    if (i < data.tenants.length - 1) tenantLines.push('') // gap between tenants
  }

  // Property line + address + start date + landlord/tenant lines
  const propertyLines = 3 // "Property:", address, tenancy start
  const maxLines = Math.max(landlordLines.length, tenantLines.length)
  const blockContentHeight = (propertyLines + 1 + maxLines) * 13 + blockPadding * 2

  drawRect(ctx.currentPage, MARGIN_LEFT, blockY - blockContentHeight, CONTENT_WIDTH, blockContentHeight, {
    color: COLORS.brandGreenLight,
    borderColor: COLORS.borderStrong,
    borderWidth: 0.5,
  })

  let innerY = blockY - blockPadding - 2

  // Property info (full width)
  drawTextRaw(ctx.currentPage, 'Property', MARGIN_LEFT + blockPadding, innerY, {
    font: ctx.fonts.bold, size: 9, leading: 13, color: COLORS.brandGreen,
  })
  innerY -= 13
  drawTextRaw(ctx.currentPage, address, MARGIN_LEFT + blockPadding, innerY, {
    font: ctx.fonts.regular, size: 9, leading: 13, color: COLORS.textPrimary,
  })
  innerY -= 13
  drawTextRaw(ctx.currentPage, `Tenancy start: ${formatDate(data.tenancyStartDate)}`, MARGIN_LEFT + blockPadding, innerY, {
    font: ctx.fonts.regular, size: 8, leading: 12, color: COLORS.textSecondary,
  })
  innerY -= 16

  // Two-column: Landlord (left) | Tenant(s) (right)
  const leftX = MARGIN_LEFT + blockPadding
  const rightX = MARGIN_LEFT + blockPadding + colWidth + blockPadding
  let leftY = innerY
  let rightY = innerY

  for (const line of landlordLines) {
    const isLabel = line === 'Landlord'
    drawTextRaw(ctx.currentPage, line, leftX, leftY, {
      font: isLabel ? ctx.fonts.bold : ctx.fonts.regular,
      size: isLabel ? 9 : 8,
      leading: 12,
      color: isLabel ? COLORS.brandGreen : COLORS.textPrimary,
    })
    leftY -= 12
  }

  for (const line of tenantLines) {
    if (line === '') { rightY -= 6; continue }
    const isLabel = line.startsWith('Tenant')
      && !line.includes('@')
      && !line.includes('+')
      && !line.includes('0')
    drawTextRaw(ctx.currentPage, line, rightX, rightY, {
      font: isLabel ? ctx.fonts.bold : ctx.fonts.regular,
      size: isLabel ? 9 : 8,
      leading: 12,
      color: isLabel ? COLORS.brandGreen : COLORS.textPrimary,
    })
    rightY -= 12
  }

  ctx.cursorY = blockY - blockContentHeight - SPACING.sectionGap

  // ── Documents list with status pills ──────────────────────────────────────

  drawText(ctx, 'Documents', { font: ctx.fonts.bold, size: 10, leading: 15, color: COLORS.textPrimary }, {})
  ctx.cursorY -= SPACING.labelValueGap

  const docRowHeight = 20
  for (const doc of data.documents) {
    const rowY = ctx.cursorY

    // Alternate row shading
    if (doc.index % 2 === 0) {
      drawRect(ctx.currentPage, MARGIN_LEFT, rowY - docRowHeight + 4, CONTENT_WIDTH, docRowHeight, {
        color: CS_COLORS.altRowBg,
      })
    }

    // Document number + title
    const docLabel = `${doc.index}. ${doc.title}`
    drawTextRaw(ctx.currentPage, docLabel, MARGIN_LEFT + 4, rowY - 2, {
      font: ctx.fonts.regular, size: 9, leading: 13, color: COLORS.textPrimary,
    })

    // Description (if present)
    if (doc.description) {
      drawTextRaw(ctx.currentPage, doc.description, MARGIN_LEFT + 18, rowY - 13, {
        font: ctx.fonts.regular, size: 7, leading: 10, color: COLORS.textSecondary,
      })
    }

    // Status pill (right-aligned)
    const statusLabel = STATUS_LABELS[doc.status] ?? doc.status.toUpperCase()
    const isIncluded = doc.status === 'uploaded' || doc.status === 'generated'
    const pillBg = isIncluded ? CS_COLORS.pillGreenBg : CS_COLORS.pillGrayBg
    const pillText = isIncluded ? CS_COLORS.pillGreenText : CS_COLORS.pillGrayText
    const pillFont = ctx.fonts.bold
    const pillFontSize = 6
    const pillW = measureText(statusLabel, pillFont, pillFontSize) + 10
    const pillH = 12
    const pillX = rightEdge - pillW - 2
    const pillY = rowY - pillH + 6

    drawRect(ctx.currentPage, pillX, pillY, pillW, pillH, { color: pillBg })
    drawTextRaw(ctx.currentPage, statusLabel, pillX + 5, pillY + 3, {
      font: pillFont, size: pillFontSize, leading: 8, color: pillText,
    })

    ctx.cursorY -= doc.description ? docRowHeight + 4 : docRowHeight
  }

  ctx.cursorY -= SPACING.blockGap

  // ── Incorporation statement (amber bordered box) ──────────────────────────

  // Measure text height for the box
  const incLines = data.incorporationStatement.split('\n')
  let totalIncLines = 0
  for (const line of incLines) {
    if (line.trim() === '') { totalIncLines += 1; continue }
    const w = measureText(line, ctx.fonts.regular, 8)
    totalIncLines += Math.ceil(w / (CONTENT_WIDTH - 20)) || 1
  }
  const incBoxH = Math.max(totalIncLines * 12 + 16, 40)

  drawRect(ctx.currentPage, MARGIN_LEFT, ctx.cursorY - incBoxH, CONTENT_WIDTH, incBoxH, {
    color: CS_COLORS.amberBg,
    borderColor: CS_COLORS.amberBorder,
    borderWidth: 1,
  })

  const savedCursor = ctx.cursorY
  ctx.cursorY = savedCursor - 10
  drawText(ctx, data.incorporationStatement, {
    font: ctx.fonts.regular, size: 8, leading: 12, color: CS_COLORS.amberText,
  }, {
    x: MARGIN_LEFT + 10,
    maxWidth: CONTENT_WIDTH - 20,
    paginate: false,
  })
  ctx.cursorY = savedCursor - incBoxH - SPACING.sectionGap

  // ── Acknowledgments ───────────────────────────────────────────────────────

  drawText(ctx, 'Acknowledgments', { font: ctx.fonts.bold, size: 10, leading: 15, color: COLORS.textPrimary }, {})
  ctx.cursorY -= SPACING.labelValueGap

  const courierStyle: TextStyle = { font: ctx.fonts.courier, size: 8, leading: 12, color: COLORS.textSecondary }

  if (data.acknowledgments.length > 0) {
    for (const ack of data.acknowledgments) {
      const partyLabel = ack.party === 'landlord' ? 'Landlord' : 'Tenant'

      drawTextRaw(ctx.currentPage, `${partyLabel}: ${ack.fullName}`, MARGIN_LEFT + 4, ctx.cursorY, {
        font: ctx.fonts.bold, size: 9, leading: 13, color: COLORS.textPrimary,
      })
      ctx.cursorY -= 13

      drawTextRaw(ctx.currentPage, `Acknowledged: ${formatDateTime(ack.acknowledgedAt)}`, MARGIN_LEFT + 4, ctx.cursorY, courierStyle)
      ctx.cursorY -= 12

      drawTextRaw(ctx.currentPage, `IP: ${ack.ipAddress}`, MARGIN_LEFT + 4, ctx.cursorY, courierStyle)
      ctx.cursorY -= 12

      if (ack.userAgent) {
        drawTextRaw(ctx.currentPage, `UA: ${ack.userAgent}`, MARGIN_LEFT + 4, ctx.cursorY, courierStyle)
        ctx.cursorY -= 12
      }

      ctx.cursorY -= SPACING.labelValueGap
    }
  }

  // Check which parties are missing
  const hasLandlord = data.acknowledgments.some(a => a.party === 'landlord')
  const hasTenant = data.acknowledgments.some(a => a.party === 'tenant')
  const allAcknowledged = hasLandlord && hasTenant

  if (!allAcknowledged) {
    const missing: string[] = []
    if (!hasLandlord) missing.push('landlord')
    if (!hasTenant) missing.push('tenant')

    // Status notice
    const noticeText = `Awaiting acknowledgment from: ${missing.join(', ')}`
    const noticeH = 18
    drawRect(ctx.currentPage, MARGIN_LEFT, ctx.cursorY - noticeH, CONTENT_WIDTH, noticeH, {
      color: CS_COLORS.amberBg,
      borderColor: CS_COLORS.amberBorder,
      borderWidth: 0.5,
    })
    drawTextRaw(ctx.currentPage, noticeText, MARGIN_LEFT + 8, ctx.cursorY - 12, {
      font: ctx.fonts.regular, size: 8, leading: 12, color: CS_COLORS.amberText,
    })
    ctx.cursorY -= noticeH + SPACING.labelValueGap
  } else {
    // Both acknowledged — green notice
    const noticeText = 'All parties have acknowledged this documentation pack.'
    const noticeH = 18
    const greenBg = rgb(240 / 255, 253 / 255, 244 / 255) // green-50
    drawRect(ctx.currentPage, MARGIN_LEFT, ctx.cursorY - noticeH, CONTENT_WIDTH, noticeH, {
      color: greenBg,
      borderColor: COLORS.successGreen,
      borderWidth: 0.5,
    })
    drawTextRaw(ctx.currentPage, noticeText, MARGIN_LEFT + 8, ctx.cursorY - 12, {
      font: ctx.fonts.regular, size: 8, leading: 12, color: COLORS.successGreen,
    })
    ctx.cursorY -= noticeH + SPACING.labelValueGap
  }

  // ── Header and footer ─────────────────────────────────────────────────────

  const totalPages = ctx.pages.length
  for (let i = 0; i < totalPages; i++) {
    drawHeader(ctx.pages[i], ctx.fonts, 'Tenancy Documentation Pack', ctx.logoImage)
    drawFooter(ctx.pages[i], ctx.fonts, i + 1, totalPages)
  }

  return finalize(ctx)
}
