/**
 * components/party-block.ts — Name/address/contact info block.
 * Renders a party's details vertically: name (bold), email, phone, address.
 */

import type { PDFParty } from '../types'
import {
  type RenderContext,
  type Fonts,
  COLORS,
  SPACING,
  TEXT_STYLES,
  drawText,
  formatAddress,
} from '../renderer'

/**
 * Draw a party info block at the current cursor position.
 * Returns the Y after the block.
 */
export function drawPartyBlock(
  ctx: RenderContext,
  party: PDFParty,
  options?: { x?: number; maxWidth?: number; label?: string }
): number {
  const styles = TEXT_STYLES(ctx.fonts)
  const x = options?.x
  const maxWidth = options?.maxWidth

  // Optional label (e.g. "Landlord", "Tenant")
  if (options?.label) {
    drawText(ctx, options.label, {
      ...styles.caption,
      color: COLORS.textMuted,
    }, { x, maxWidth })
    ctx.cursorY += styles.caption.leading // undo the full leading, add small gap
    ctx.cursorY -= SPACING.labelValueGap + styles.caption.leading
  }

  // Name
  drawText(ctx, party.fullName, styles.subheading, { x, maxWidth })

  // Email
  drawText(ctx, party.email, {
    ...styles.body,
    color: COLORS.textSecondary,
  }, { x, maxWidth })

  // Phone
  if (party.phone) {
    drawText(ctx, party.phone, {
      ...styles.body,
      color: COLORS.textSecondary,
    }, { x, maxWidth })
  }

  // Address
  if (party.address) {
    const addrStr = formatAddress(party.address)
    drawText(ctx, addrStr, {
      ...styles.body,
      color: COLORS.textSecondary,
    }, { x, maxWidth })
  }

  return ctx.cursorY
}
