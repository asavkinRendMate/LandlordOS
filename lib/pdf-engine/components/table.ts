/**
 * components/table.ts — Generic table component.
 * Supports key-value (2-column) and multi-column row tables.
 */

import {
  type RenderContext,
  MARGIN_LEFT,
  CONTENT_WIDTH,
  COLORS,
  TEXT_STYLES,
  drawRect,
  drawLine,
  drawText,
  ensureSpace,
  wrapText,
  type TextStyle,
} from '../renderer'
import type { RGB } from 'pdf-lib'

export interface TableColumn {
  header: string
  width: number // pt
  align?: 'left' | 'center' | 'right'
}

export interface TableRow {
  cells: string[]
  highlight?: 'amber' | 'red' | 'green'
}

/**
 * Draw a multi-column table with header row and data rows.
 * Returns Y after table.
 */
export function drawTable(
  ctx: RenderContext,
  columns: TableColumn[],
  rows: TableRow[],
  options?: { x?: number; maxWidth?: number; alternateShading?: boolean }
): number {
  const x = options?.x ?? MARGIN_LEFT
  const styles = TEXT_STYLES(ctx.fonts)
  const rowPadding = 6
  const headerHeight = 22
  const rowHeight = 20
  const alternateShading = options?.alternateShading ?? false

  // Header row
  ensureSpace(ctx, headerHeight + rowHeight * Math.min(rows.length, 3))

  const headerY = ctx.cursorY
  drawRect(ctx.currentPage, x, headerY - headerHeight, CONTENT_WIDTH, headerHeight, {
    color: COLORS.brandGreenLight,
  })

  let colX = x
  for (const col of columns) {
    ctx.currentPage.drawText(col.header, {
      x: colX + 4,
      y: headerY - 15,
      size: 8,
      font: ctx.fonts.bold,
      color: COLORS.textPrimary,
    })
    colX += col.width
  }

  ctx.cursorY = headerY - headerHeight

  // Header bottom border
  drawLine(ctx.currentPage, x, ctx.cursorY, x + CONTENT_WIDTH, ctx.cursorY, {
    color: COLORS.borderStrong,
  })

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    ensureSpace(ctx, rowHeight)

    const rowY = ctx.cursorY

    // Highlight or alternate shading
    if (row.highlight === 'amber') {
      drawRect(ctx.currentPage, x, rowY - rowHeight, CONTENT_WIDTH, rowHeight, {
        color: COLORS.warningAmber,
        borderColor: undefined,
      })
      // Use a light amber tint instead of solid amber
      drawRect(ctx.currentPage, x, rowY - rowHeight, CONTENT_WIDTH, rowHeight, {
        color: COLORS.white,
      })
      drawRect(ctx.currentPage, x, rowY - rowHeight, CONTENT_WIDTH, rowHeight, {
        borderColor: COLORS.warningAmber,
        borderWidth: 0.5,
      })
    } else if (row.highlight === 'red') {
      drawRect(ctx.currentPage, x, rowY - rowHeight, CONTENT_WIDTH, rowHeight, {
        borderColor: COLORS.dangerRed,
        borderWidth: 0.5,
      })
    } else if (alternateShading && i % 2 === 1) {
      drawRect(ctx.currentPage, x, rowY - rowHeight, CONTENT_WIDTH, rowHeight, {
        color: COLORS.brandGreenLight,
      })
    }

    colX = x
    for (let j = 0; j < columns.length; j++) {
      const cell = row.cells[j] ?? ''
      const col = columns[j]
      const textColor = row.highlight === 'amber' ? COLORS.warningAmber :
                        row.highlight === 'red' ? COLORS.dangerRed :
                        COLORS.textPrimary

      ctx.currentPage.drawText(cell.slice(0, 80), {
        x: colX + 4,
        y: rowY - 14,
        size: 8,
        font: ctx.fonts.regular,
        color: textColor,
      })
      colX += col.width
    }

    ctx.cursorY = rowY - rowHeight

    // Row bottom border
    drawLine(ctx.currentPage, x, ctx.cursorY, x + CONTENT_WIDTH, ctx.cursorY, {
      color: COLORS.borderDefault,
      thickness: 0.5,
    })
  }

  return ctx.cursorY
}

/**
 * Draw a key-value table (2 columns: label, value).
 * Returns Y after table.
 */
export function drawKeyValueTable(
  ctx: RenderContext,
  items: Array<{ label: string; value: string }>,
  options?: {
    x?: number
    maxWidth?: number
    labelWidth?: number
    bordered?: boolean
    bgColor?: ReturnType<typeof import('pdf-lib').rgb>
  }
): number {
  const x = options?.x ?? MARGIN_LEFT
  const maxWidth = options?.maxWidth ?? CONTENT_WIDTH
  const labelWidth = options?.labelWidth ?? 160
  const valueWidth = maxWidth - labelWidth
  const styles = TEXT_STYLES(ctx.fonts)
  const rowHeight = 20
  const bordered = options?.bordered ?? false

  if (bordered || options?.bgColor) {
    const totalHeight = items.length * rowHeight + 8
    ensureSpace(ctx, totalHeight)

    drawRect(ctx.currentPage, x, ctx.cursorY - totalHeight, maxWidth, totalHeight, {
      color: options?.bgColor,
      borderColor: bordered ? COLORS.borderDefault : undefined,
      borderWidth: bordered ? 1 : undefined,
    })
    ctx.cursorY -= 4
  }

  for (const item of items) {
    ensureSpace(ctx, rowHeight)

    const rowY = ctx.cursorY

    // Label
    ctx.currentPage.drawText(item.label, {
      x: x + 8,
      y: rowY - 14,
      size: 9,
      font: ctx.fonts.bold,
      color: COLORS.textSecondary,
    })

    // Value
    ctx.currentPage.drawText(item.value.slice(0, 100), {
      x: x + labelWidth,
      y: rowY - 14,
      size: 9,
      font: ctx.fonts.regular,
      color: COLORS.textPrimary,
    })

    ctx.cursorY = rowY - rowHeight
  }

  if (bordered || options?.bgColor) {
    ctx.cursorY -= 4
  }

  return ctx.cursorY
}
