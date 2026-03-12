/**
 * components/clause-block.ts — Numbered clause with bold heading + body text.
 * Auto page-break when less than 80pt remains.
 */

import {
  type RenderContext,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  SPACING,
  TEXT_STYLES,
  OVERFLOW_THRESHOLD,
  ensureSpace,
  drawText,
} from '../renderer'

/**
 * Draw a numbered clause: "N. Heading" (bold) + body text.
 * Returns Y after clause.
 */
export function drawClauseBlock(
  ctx: RenderContext,
  clauseNumber: number,
  heading: string,
  body: string,
  options?: { x?: number; maxWidth?: number }
): number {
  const x = options?.x ?? MARGIN_LEFT
  const maxWidth = options?.maxWidth ?? CONTENT_WIDTH
  const styles = TEXT_STYLES(ctx.fonts)

  // Check if we need a new page
  ensureSpace(ctx, OVERFLOW_THRESHOLD)

  // Heading: "N. Heading"
  const headingText = `${clauseNumber}. ${heading}`
  drawText(ctx, headingText, styles.subheading, { x, maxWidth })

  ctx.cursorY -= SPACING.labelValueGap

  // Body text
  drawText(ctx, body, styles.body, { x: x + 16, maxWidth: maxWidth - 16 })

  ctx.cursorY -= SPACING.blockGap

  return ctx.cursorY
}
