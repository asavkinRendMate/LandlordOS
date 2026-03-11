/**
 * components/photo-grid.ts — 1/2/3 column photo grid with captions and attribution pills.
 *
 * Layout:
 * - 1 photo: full width (483pt), max height 280pt
 * - 2 photos: 2 columns, 232pt each, gap 8pt
 * - 3+ photos: 3 columns, 151pt each, gap 8pt, wrapping
 */

import type { PDFPhoto } from '../types'
import {
  type RenderContext,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  COLORS,
  SPACING,
  TEXT_STYLES,
  ensureSpace,
  drawText,
  drawImage,
  drawPlaceholder,
  drawRect,
  fetchAndEmbedImage,
  wrapText,
} from '../renderer'
import type { PDFImage } from 'pdf-lib'

interface PhotoWithImage {
  photo: PDFPhoto
  image: PDFImage | null
}

/**
 * Draw a photo grid. Fetches all images first, then lays out.
 * Returns Y after the grid.
 */
export async function drawPhotoGrid(
  ctx: RenderContext,
  photos: PDFPhoto[],
  options?: { x?: number; maxWidth?: number }
): Promise<number> {
  if (photos.length === 0) return ctx.cursorY

  const x = options?.x ?? MARGIN_LEFT
  const maxWidth = options?.maxWidth ?? CONTENT_WIDTH
  const styles = TEXT_STYLES(ctx.fonts)
  const gap = SPACING.photoGridGap

  // Fetch all images in parallel
  const loaded: PhotoWithImage[] = await Promise.all(
    photos.map(async (photo) => ({
      photo,
      image: await fetchAndEmbedImage(ctx.doc, photo.url),
    }))
  )

  // Determine layout
  const count = loaded.length
  let cols: number
  let colWidth: number
  let maxPhotoHeight: number

  if (count === 1) {
    cols = 1
    colWidth = maxWidth
    maxPhotoHeight = 280
  } else if (count === 2) {
    cols = 2
    colWidth = Math.floor((maxWidth - gap) / 2)
    maxPhotoHeight = 200
  } else {
    cols = 3
    colWidth = Math.floor((maxWidth - gap * 2) / 3)
    maxPhotoHeight = 160
  }

  const captionHeight = 20 // space for caption below photo
  const pillHeight = 14
  const rowHeight = maxPhotoHeight + captionHeight + SPACING.blockGap

  // Render in rows
  for (let i = 0; i < loaded.length; i += cols) {
    const rowItems = loaded.slice(i, i + cols)

    // Ensure space for this row
    ensureSpace(ctx, rowHeight)

    for (let j = 0; j < rowItems.length; j++) {
      const { photo, image } = rowItems[j]
      const cellX = x + j * (colWidth + gap)
      const cellY = ctx.cursorY

      if (image) {
        // Draw image preserving aspect ratio
        const drawn = drawImage(ctx.currentPage, image, cellX, cellY, colWidth, maxPhotoHeight)

        // Attribution pill top-right
        const pillText = photo.uploadedBy === 'landlord' ? 'Landlord' : 'Tenant'
        const pillBg = photo.uploadedBy === 'landlord' ? COLORS.brandGreen : COLORS.successGreen
        const pillTextWidth = ctx.fonts.regular.widthOfTextAtSize(pillText, 7)
        const pillW = pillTextWidth + 8
        const pillX = cellX + drawn.width - pillW - 4
        const pillY = cellY - 4 - pillHeight

        drawRect(ctx.currentPage, pillX, pillY, pillW, pillHeight, { color: pillBg })
        ctx.currentPage.drawText(pillText, {
          x: pillX + 4,
          y: pillY + 3,
          size: 7,
          font: ctx.fonts.regular,
          color: COLORS.white,
        })

        // Caption below photo
        if (photo.caption) {
          const captionLines = wrapText(photo.caption, ctx.fonts.regular, 8, colWidth)
          const captionY = cellY - drawn.height - 10
          for (let l = 0; l < Math.min(captionLines.length, 2); l++) {
            const lineW = ctx.fonts.regular.widthOfTextAtSize(captionLines[l], 8)
            ctx.currentPage.drawText(captionLines[l], {
              x: cellX + (colWidth - lineW) / 2,
              y: captionY - l * 12,
              size: 8,
              font: ctx.fonts.regular,
              color: COLORS.textSecondary,
            })
          }
        }
      } else {
        // Placeholder
        drawPlaceholder(ctx.currentPage, cellX, cellY, colWidth, maxPhotoHeight, photo.caption || '', ctx.fonts.regular)

        if (photo.caption) {
          const lineW = ctx.fonts.regular.widthOfTextAtSize(photo.caption, 8)
          ctx.currentPage.drawText(photo.caption.slice(0, 60), {
            x: cellX + (colWidth - Math.min(lineW, colWidth)) / 2,
            y: cellY - maxPhotoHeight - 10,
            size: 8,
            font: ctx.fonts.regular,
            color: COLORS.textSecondary,
          })
        }
      }
    }

    // Move cursor down past this row
    ctx.cursorY -= rowHeight
  }

  return ctx.cursorY
}
