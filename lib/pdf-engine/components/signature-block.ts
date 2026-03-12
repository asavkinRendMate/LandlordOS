/**
 * components/signature-block.ts — Signature line or embedded image + date.
 */

import type { PDFSignatureBlock } from '../types'
import {
  type RenderContext,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  COLORS,
  SPACING,
  TEXT_STYLES,
  drawText,
  drawLine,
  formatDate,
} from '../renderer'

/**
 * Draw a signature block: name, signature line (or image), date, witness line.
 * Returns Y after block.
 */
export function drawSignatureBlock(
  ctx: RenderContext,
  sig: PDFSignatureBlock,
  options?: { x?: number; maxWidth?: number; label?: string }
): number {
  const styles = TEXT_STYLES(ctx.fonts)
  const x = options?.x ?? MARGIN_LEFT
  const maxWidth = options?.maxWidth ?? CONTENT_WIDTH

  // Label
  if (options?.label) {
    drawText(ctx, options.label, {
      ...styles.caption,
      color: COLORS.textMuted,
    }, { x, maxWidth })
  }

  // Name
  drawText(ctx, sig.party.fullName, styles.subheading, { x, maxWidth })
  ctx.cursorY -= SPACING.labelValueGap

  // Signature line
  drawText(ctx, 'Signature:', styles.caption, { x, maxWidth })
  ctx.cursorY -= 4
  drawLine(ctx.currentPage, x, ctx.cursorY, x + maxWidth * 0.6, ctx.cursorY, {
    color: COLORS.borderStrong,
  })
  ctx.cursorY -= SPACING.blockGap

  // Date line
  if (sig.signedAt) {
    drawText(ctx, `Signed on: ${formatDate(sig.signedAt)}`, styles.body, { x, maxWidth })
  } else {
    drawText(ctx, 'Date:', styles.caption, { x, maxWidth })
    ctx.cursorY -= 4
    drawLine(ctx.currentPage, x, ctx.cursorY, x + maxWidth * 0.4, ctx.cursorY, {
      color: COLORS.borderStrong,
    })
    ctx.cursorY -= SPACING.blockGap
  }

  // Witness line
  ctx.cursorY -= SPACING.labelValueGap
  drawText(ctx, 'Witness:', styles.caption, { x, maxWidth })
  ctx.cursorY -= 4
  drawLine(ctx.currentPage, x, ctx.cursorY, x + maxWidth * 0.6, ctx.cursorY, {
    color: COLORS.borderStrong,
  })
  ctx.cursorY -= SPACING.blockGap

  return ctx.cursorY
}
