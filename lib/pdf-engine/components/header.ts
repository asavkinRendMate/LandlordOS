/**
 * components/header.ts — Branded page header band.
 * Full-width green band, 56pt tall (10pt padding + 36pt logo + 10pt padding).
 * Left: logo or "LetSorted", Right: doc type label. Horizontal rule below.
 */

import { PDFPage, PDFImage } from 'pdf-lib'
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_TOP,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  HEADER_HEIGHT,
  COLORS,
  type Fonts,
  drawRect,
  drawLine,
} from '../renderer'

export function drawHeader(
  page: PDFPage,
  fonts: Fonts,
  docTypeLabel: string,
  logoImage?: PDFImage,
) {
  const bandY = PAGE_HEIGHT - MARGIN_TOP
  const bandHeight = HEADER_HEIGHT

  // Green background band — full width within margins
  drawRect(page, MARGIN_LEFT, bandY - bandHeight, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT, bandHeight, {
    color: COLORS.brandGreen,
  })

  // Left: logo image or text fallback
  if (logoImage) {
    const maxHeight = 36
    const scale = maxHeight / logoImage.height
    const logoWidth = logoImage.width * scale
    const logoX = MARGIN_LEFT + 8
    const logoY = (bandY - bandHeight) + (bandHeight - maxHeight) / 2

    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoWidth,
      height: maxHeight,
    })
  } else {
    // Fallback: text "LetSorted" in white Helvetica-Bold 14pt
    page.drawText('LetSorted', {
      x: MARGIN_LEFT + 12,
      y: bandY - bandHeight / 2 - 5,
      size: 14,
      font: fonts.bold,
      color: COLORS.white,
    })
  }

  // Doc type label right-aligned, vertically centred in band
  const labelSize = 10
  const labelWidth = fonts.regular.widthOfTextAtSize(docTypeLabel, labelSize)
  page.drawText(docTypeLabel, {
    x: PAGE_WIDTH - MARGIN_RIGHT - 12 - labelWidth,
    y: bandY - bandHeight / 2 - labelSize / 2,
    size: labelSize,
    font: fonts.regular,
    color: COLORS.white,
  })

  // Horizontal rule below header
  const ruleY = bandY - bandHeight
  drawLine(page, MARGIN_LEFT, ruleY, PAGE_WIDTH - MARGIN_RIGHT, ruleY, {
    color: COLORS.borderDefault,
    thickness: 1,
  })
}
