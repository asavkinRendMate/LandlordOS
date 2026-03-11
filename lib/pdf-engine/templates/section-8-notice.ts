/**
 * templates/section-8-notice.ts — Statutory notice seeking possession.
 *
 * More austere style: no cover page, no green header band, plain border.
 * Brand appears only in footer.
 */

import type { Section8NoticeData, Section8Ground } from '../types'
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

const GROUND_TEXT: Record<Section8Ground, string> = {
  GROUND_1:
    "The dwelling-house was occupied by the landlord or the landlord's spouse or civil partner as their only or principal home; or the landlord requires the dwelling-house as the only or principal home for the landlord or the landlord's spouse or civil partner.",
  GROUND_2:
    'The dwelling-house is subject to a mortgage granted before the beginning of the tenancy and the mortgagee is entitled to exercise a power of sale conferred on the mortgagee by the mortgage or by section 101 of the Law of Property Act 1925.',
  GROUND_7A:
    'The tenant or a person residing in or visiting the dwelling-house has been convicted of a serious offence, or has been found, by a court, to be in breach of an injunction to prevent nuisance and annoyance.',
  GROUND_8:
    "Both at the date of the service of this notice and at the date of the hearing, at least two months' rent lawfully due from the tenant is unpaid.",
  GROUND_10:
    'Some rent lawfully due from the tenant is unpaid on the date on which these proceedings are begun.',
  GROUND_11:
    'Whether or not any rent is in arrears on the date proceedings are begun, the tenant has persistently delayed paying rent which has become lawfully due.',
  GROUND_14:
    'The tenant or a person residing in or visiting the dwelling-house has been guilty of conduct causing or likely to cause a nuisance or annoyance to a person residing, visiting or otherwise engaging in a lawful activity in the locality.',
}

export async function renderSection8Notice(data: Section8NoticeData): Promise<{ buffer: Buffer; pageCount: number }> {
  // No branded header — austere style
  const ctx = await createRenderContext('Section 8 Notice', {
    drawHeader: false,
  })
  const styles = TEXT_STYLES(ctx.fonts)
  const address = formatAddress(data.property)

  // Plain border around content area on every page will be drawn at the end

  // ── Statutory header ────────────────────────────────────────────────────

  ctx.cursorY = PAGE_HEIGHT - MARGIN_TOP - 10

  drawText(ctx,
    'Notice Seeking Possession of a Property Let on an Assured Tenancy or an Assured Agricultural Occupancy',
    { font: ctx.fonts.bold, size: 14, leading: 19, color: COLORS.textPrimary },
    { align: 'center' },
  )

  ctx.cursorY -= 8

  drawText(ctx,
    "Housing Act 1988 Section 8 as amended by the Housing Act 1996 and the Renters' Rights Act 2025",
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
    if (tenant.phone) {
      drawText(ctx, tenant.phone, { ...styles.body, color: COLORS.textSecondary }, {})
    }
    ctx.cursorY -= SPACING.blockGap
  }

  // Arrears info
  if (data.arrearsAmountPence != null) {
    ctx.cursorY -= SPACING.blockGap
    drawText(ctx, `Rent arrears: ${formatPence(data.arrearsAmountPence)}`, styles.subheading, {})
    if (data.arrearsCalculatedTo) {
      drawText(ctx, `Calculated to: ${formatDate(data.arrearsCalculatedTo)}`, styles.body, {})
    }
  }

  // ── Grounds ────────────────────────────────────────────────────────────

  addPage(ctx)

  drawText(ctx, 'Grounds for Possession', styles.title, {})
  ctx.cursorY -= SPACING.sectionGap

  for (const ground of data.grounds) {
    ensureSpace(ctx, 120)

    // Ground number
    const groundLabel = ground.replace('_', ' ')
    drawText(ctx, groundLabel, styles.sectionHeading, {})
    ctx.cursorY -= SPACING.labelValueGap

    // Statutory text
    const statText = GROUND_TEXT[ground] ?? ''
    if (statText) {
      drawText(ctx, statText, { ...styles.legal, color: COLORS.textSecondary }, {
        x: MARGIN_LEFT + 8,
        maxWidth: CONTENT_WIDTH - 8,
      })
    }
    ctx.cursorY -= SPACING.blockGap

    // Evidence
    const evidence = data.groundEvidence[ground]
    if (evidence) {
      drawText(ctx, 'Evidence:', styles.subheading, { x: MARGIN_LEFT + 8 })
      ctx.cursorY -= SPACING.labelValueGap
      drawText(ctx, evidence, styles.body, {
        x: MARGIN_LEFT + 8,
        maxWidth: CONTENT_WIDTH - 8,
      })
    }

    ctx.cursorY -= SPACING.sectionGap
  }

  // ── Possession date ────────────────────────────────────────────────────

  ensureSpace(ctx, 80)
  drawLine(ctx.currentPage, MARGIN_LEFT, ctx.cursorY, PAGE_WIDTH - MARGIN_RIGHT, ctx.cursorY, {
    color: COLORS.borderStrong,
  })
  ctx.cursorY -= SPACING.sectionGap

  drawText(ctx,
    `Proceedings for possession will not begin before: ${formatDate(data.possessionAfter)}`,
    styles.sectionHeading,
    {},
  )
  ctx.cursorY -= SPACING.sectionGap

  // ── Signature ──────────────────────────────────────────────────────────

  drawSignatureBlock(ctx, data.landlordSignature, { label: 'Landlord' })

  // ── Plain border + footers ─────────────────────────────────────────────

  const totalPages = ctx.pages.length
  for (let i = 0; i < totalPages; i++) {
    const page = ctx.pages[i]
    // Plain border
    drawRect(page, MARGIN_LEFT - 8, MARGIN_BOTTOM + 24, CONTENT_WIDTH + 16, PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - 16, {
      borderColor: COLORS.borderStrong,
      borderWidth: 0.5,
    })
    drawFooter(page, ctx.fonts, i + 1, totalPages)
  }

  return finalize(ctx)
}
