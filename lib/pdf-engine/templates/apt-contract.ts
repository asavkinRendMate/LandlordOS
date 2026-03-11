/**
 * templates/apt-contract.ts — Assured Periodic Tenancy agreement.
 *
 * Structure:
 * 1. Cover page
 * 2. Legal notice + Parties page
 * 3. Key terms summary box
 * 4. Clauses
 * 5. Special conditions (if any)
 * 6. Signature page
 */

import type { AptContractData } from '../types'
import {
  type RenderContext,
  createRenderContext,
  addPage,
  finalize,
  formatAddress,
  formatDate,
  formatPence,
  MARGIN_LEFT,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_WIDTH,
  COLORS,
  SPACING,
  TEXT_STYLES,
  drawText,
  drawRect,
  drawLine,
  ensureSpace,
} from '../renderer'
import { drawHeader } from '../components/header'
import { drawFooter } from '../components/footer'
import { drawPartyBlock } from '../components/party-block'
import { drawSignatureBlock } from '../components/signature-block'
import { drawClauseBlock } from '../components/clause-block'
import { drawKeyValueTable } from '../components/table'

export async function renderAptContract(data: AptContractData): Promise<{ buffer: Buffer; pageCount: number }> {
  const ctx = await createRenderContext('Tenancy Agreement', {
    drawHeader: true,
    skipHeaderOnFirstPage: true,
  })
  const styles = TEXT_STYLES(ctx.fonts)
  const address = formatAddress(data.property)

  // ── Page 1: Cover ──────────────────────────────────────────────────────

  drawRect(ctx.currentPage, 0, PAGE_HEIGHT - 220, PAGE_WIDTH, 220, {
    color: COLORS.brandGreen,
  })

  ctx.currentPage.drawText('Assured Periodic Tenancy', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 90,
    size: 24,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })

  ctx.currentPage.drawText('Agreement', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 118,
    size: 24,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })

  ctx.currentPage.drawText(address, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 150,
    size: 12,
    font: ctx.fonts.regular,
    color: COLORS.white,
  })

  ctx.currentPage.drawText(`Tenancy start: ${formatDate(data.tenancyStartDate)}`, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 175,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.white,
  })

  ctx.currentPage.drawText(`Created: ${formatDate(data.createdAt)}`, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 250,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })

  // ── Page 2: Legal notice + Parties ─────────────────────────────────────

  addPage(ctx)

  // Legal notice
  const legalNotice =
    'This agreement creates an Assured Periodic Tenancy under the Housing Act 1988 as amended by the ' +
    "Renters' Rights Act 2025. Fixed-term tenancies are no longer permitted for residential lets in England."

  const noticeBoxHeight = 50
  drawRect(ctx.currentPage, MARGIN_LEFT, ctx.cursorY - noticeBoxHeight, CONTENT_WIDTH, noticeBoxHeight, {
    color: COLORS.brandGreenLight,
    borderColor: COLORS.brandGreen,
    borderWidth: 1,
  })

  // Save cursor, draw inside the box, restore
  const savedCursor = ctx.cursorY
  ctx.cursorY = savedCursor - 14
  drawText(ctx, legalNotice, {
    ...styles.caption,
    color: COLORS.brandGreen,
  }, {
    x: MARGIN_LEFT + 8,
    maxWidth: CONTENT_WIDTH - 16,
    paginate: false,
  })
  ctx.cursorY = savedCursor - noticeBoxHeight - SPACING.sectionGap

  // Parties
  drawText(ctx, 'Parties', styles.title, {})
  ctx.cursorY -= SPACING.blockGap

  drawPartyBlock(ctx, data.landlord.party, { label: 'Landlord' })
  ctx.cursorY -= SPACING.sectionGap

  for (let i = 0; i < data.tenants.length; i++) {
    drawPartyBlock(ctx, data.tenants[i].party, {
      label: data.tenants.length > 1 ? `Tenant ${i + 1}` : 'Tenant',
    })
    ctx.cursorY -= SPACING.blockGap
  }

  // Permitted occupiers
  if (data.permittedOccupiers && data.permittedOccupiers.length > 0) {
    ctx.cursorY -= SPACING.blockGap
    drawText(ctx, 'Permitted Occupiers', styles.subheading, {})
    for (const occ of data.permittedOccupiers) {
      drawText(ctx, `  ${occ}`, styles.body, {})
    }
  }

  // ── Key terms ──────────────────────────────────────────────────────────

  addPage(ctx)

  drawText(ctx, 'Key Terms', styles.title, {})
  ctx.cursorY -= SPACING.blockGap

  drawKeyValueTable(ctx, [
    { label: 'Tenancy Start', value: formatDate(data.tenancyStartDate) },
    { label: 'Monthly Rent', value: formatPence(data.monthlyRentPence) },
    { label: 'Rent Due Day', value: `${data.rentDueDay}${ordinal(data.rentDueDay)} of each month` },
    { label: 'Deposit', value: formatPence(data.depositPence) },
    { label: 'Deposit Scheme', value: data.depositScheme ?? 'To be confirmed within 30 days of tenancy commencement' },
    { label: 'Deposit Reference', value: data.depositReference ?? 'Pending' },
    { label: 'Property', value: address },
  ], { bordered: true, bgColor: COLORS.brandGreenLight })

  if (data.petClause) {
    ctx.cursorY -= SPACING.blockGap
    drawText(ctx, `Pets: ${data.petClause}`, styles.body, {})
  }

  // ── Clauses ────────────────────────────────────────────────────────────

  addPage(ctx)

  drawText(ctx, 'Terms and Conditions', styles.title, {})
  ctx.cursorY -= SPACING.sectionGap

  for (let i = 0; i < data.clauses.length; i++) {
    drawClauseBlock(ctx, i + 1, data.clauses[i].heading, data.clauses[i].body)
  }

  // ── Special conditions ─────────────────────────────────────────────────

  if (data.specialConditions) {
    ensureSpace(ctx, 100)

    ctx.cursorY -= SPACING.sectionGap
    drawText(ctx, 'Special Conditions', styles.sectionHeading, {})
    ctx.cursorY -= SPACING.blockGap

    // Amber border box
    const scY = ctx.cursorY
    const lines = data.specialConditions.split('\n')
    const boxH = Math.max(lines.length * 15 + 20, 50)

    drawRect(ctx.currentPage, MARGIN_LEFT, scY - boxH, CONTENT_WIDTH, boxH, {
      borderColor: COLORS.warningAmber,
      borderWidth: 1.5,
    })

    ctx.cursorY -= 10
    drawText(ctx, data.specialConditions, styles.body, {
      x: MARGIN_LEFT + 8,
      maxWidth: CONTENT_WIDTH - 16,
    })
    ctx.cursorY -= 10
  }

  // ── Signature page ─────────────────────────────────────────────────────

  addPage(ctx)

  drawText(ctx, 'Signatures', styles.title, {})
  ctx.cursorY -= SPACING.sectionGap

  // Landlord signature
  drawSignatureBlock(ctx, data.landlord, { label: 'Landlord' })
  ctx.cursorY -= SPACING.sectionGap

  // Tenant signatures
  for (let i = 0; i < data.tenants.length; i++) {
    ensureSpace(ctx, 120)
    drawSignatureBlock(ctx, data.tenants[i], {
      label: data.tenants.length > 1 ? `Tenant ${i + 1}` : 'Tenant',
    })
    ctx.cursorY -= SPACING.sectionGap
  }

  // Footer disclaimer
  ctx.cursorY -= SPACING.blockGap
  drawText(ctx,
    'This document was generated by LetSorted (letsorted.co.uk) from a pre-approved template. ' +
    'It should be reviewed by a qualified solicitor before signing if you have any doubts about its terms.',
    styles.legal,
    {},
  )

  // ── Headers and footers ─────────────────────────────────────────────────

  const totalPages = ctx.pages.length
  for (let i = 0; i < totalPages; i++) {
    if (i > 0) drawHeader(ctx.pages[i], ctx.fonts, 'Tenancy Agreement', ctx.logoImage)
    drawFooter(ctx.pages[i], ctx.fonts, i + 1, totalPages)
  }

  return finalize(ctx)
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
