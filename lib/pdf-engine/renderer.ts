/**
 * renderer.ts — Core pdf-lib helpers for the PDF engine.
 *
 * Page setup, font loading, colour constants, text/shape drawing,
 * cursor tracking, and automatic page overflow management.
 */

import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
  PDFImage,
} from 'pdf-lib'
import { getLogoBase64 } from './loadLogo'

// ── Page dimensions (A4 portrait) ────────────────────────────────────────────

export const PAGE_WIDTH = 595
export const PAGE_HEIGHT = 842
export const MARGIN_TOP = 48
export const MARGIN_BOTTOM = 48
export const MARGIN_LEFT = 56
export const MARGIN_RIGHT = 56
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT // 483
export const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM // 746
export const OVERFLOW_THRESHOLD = 80
export const HEADER_HEIGHT = 36
export const GAP_AFTER_HEADER = 16
/** Y coordinate where content begins on pages with a header band */
export const CONTENT_START_Y = PAGE_HEIGHT - MARGIN_TOP - HEADER_HEIGHT - GAP_AFTER_HEADER // 742

// ── Colours ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return rgb(r, g, b)
}

export const COLORS = {
  brandGreen: hexToRgb('#2D6A4F'),
  brandGreenLight: hexToRgb('#F0F7F4'),
  textPrimary: hexToRgb('#1A1A1A'),
  textSecondary: hexToRgb('#5C5C5C'),
  textMuted: hexToRgb('#9CA3AF'),
  borderDefault: hexToRgb('#E5E7EB'),
  borderStrong: hexToRgb('#D1D5DB'),
  dangerRed: hexToRgb('#DC2626'),
  warningAmber: hexToRgb('#D97706'),
  successGreen: hexToRgb('#16A34A'),
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
  greyPlaceholder: hexToRgb('#D1D5DB'),
} as const

export const GRADE_COLORS: Record<string, ReturnType<typeof rgb>> = {
  A: hexToRgb('#16A34A'),
  B: hexToRgb('#65A30D'),
  C: hexToRgb('#D97706'),
  D: hexToRgb('#EA580C'),
  F: hexToRgb('#DC2626'),
}

export const SEVERITY_COLORS: Record<string, ReturnType<typeof rgb>> = {
  INFO: hexToRgb('#9CA3AF'),
  WARNING: hexToRgb('#D97706'),
  FAIL: hexToRgb('#DC2626'),
}

export const CONDITION_COLORS: Record<string, ReturnType<typeof rgb>> = {
  GOOD: hexToRgb('#16A34A'),
  FAIR: hexToRgb('#D97706'),
  POOR: hexToRgb('#DC2626'),
}

// ── Typography ───────────────────────────────────────────────────────────────

export interface Fonts {
  regular: PDFFont
  bold: PDFFont
  courier: PDFFont
}

export interface TextStyle {
  font: PDFFont
  size: number
  leading: number
  color?: ReturnType<typeof rgb>
}

export const TEXT_STYLES = (fonts: Fonts) => ({
  title: { font: fonts.bold, size: 20, leading: 26, color: COLORS.textPrimary } as TextStyle,
  sectionHeading: { font: fonts.bold, size: 13, leading: 18, color: COLORS.textPrimary } as TextStyle,
  subheading: { font: fonts.bold, size: 11, leading: 16, color: COLORS.textPrimary } as TextStyle,
  body: { font: fonts.regular, size: 10, leading: 15, color: COLORS.textPrimary } as TextStyle,
  caption: { font: fonts.regular, size: 8, leading: 12, color: COLORS.textSecondary } as TextStyle,
  footer: { font: fonts.regular, size: 8, leading: 12, color: COLORS.textMuted } as TextStyle,
  legal: { font: fonts.regular, size: 7, leading: 11, color: COLORS.textSecondary } as TextStyle,
})

// ── Spacing ──────────────────────────────────────────────────────────────────

export const SPACING = {
  sectionGap: 28,
  blockGap: 14,
  labelValueGap: 4,
  photoGridGap: 8,
} as const

// ── Renderer context ─────────────────────────────────────────────────────────

export interface RenderContext {
  doc: PDFDocument
  fonts: Fonts
  pages: PDFPage[]
  currentPage: PDFPage
  cursorY: number
  pageIndex: number
  /** Document type label for header, e.g. "Screening Report" */
  docTypeLabel: string
  /** Whether to draw the branded header on pages (false for section-8) */
  drawHeader: boolean
  /** Whether to skip the header on page 0 (cover page) */
  skipHeaderOnFirstPage: boolean
  /** Pre-embedded logo image for header — undefined if loading failed */
  logoImage?: PDFImage
}

export async function createRenderContext(
  docTypeLabel: string,
  options?: { drawHeader?: boolean; skipHeaderOnFirstPage?: boolean }
): Promise<RenderContext> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const courier = await doc.embedFont(StandardFonts.Courier)
  const fonts: Fonts = { regular, bold, courier }
  const drawHeader = options?.drawHeader ?? true
  const skipHeaderOnFirstPage = options?.skipHeaderOnFirstPage ?? false

  // Auto-load logo for header
  let logoImage: PDFImage | undefined
  if (drawHeader) {
    try {
      const logoBase64 = await getLogoBase64()
      const logoBytes = Buffer.from(logoBase64, 'base64')
      logoImage = await doc.embedPng(logoBytes)
    } catch {
      // Fallback: no logo, header will use text
    }
  }

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const startY = drawHeader && !skipHeaderOnFirstPage
    ? CONTENT_START_Y
    : PAGE_HEIGHT - MARGIN_TOP

  return {
    doc,
    fonts,
    pages: [page],
    currentPage: page,
    cursorY: startY,
    pageIndex: 0,
    docTypeLabel,
    drawHeader,
    skipHeaderOnFirstPage,
    logoImage,
  }
}

// ── Page management ──────────────────────────────────────────────────────────

/** Add a new page to the document and update the context cursor. */
export function addPage(ctx: RenderContext): PDFPage {
  const page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  ctx.pages.push(page)
  ctx.currentPage = page
  ctx.pageIndex = ctx.pages.length - 1

  // If this page gets a header, start cursor below it
  if (ctx.drawHeader) {
    ctx.cursorY = CONTENT_START_Y
  } else {
    ctx.cursorY = PAGE_HEIGHT - MARGIN_TOP
  }

  return page
}

/** Check if we need a new page; add one if so. Returns true if a new page was added. */
export function ensureSpace(ctx: RenderContext, needed: number): boolean {
  if (ctx.cursorY - needed < MARGIN_BOTTOM + 28) { // 28 = footer height
    addPage(ctx)
    return true
  }
  return false
}

// ── Text drawing ─────────────────────────────────────────────────────────────

/** Measure the width of a string in the given font/size. */
export function measureText(text: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(text, size)
}

/** Word-wrap text to fit within maxWidth, returning array of lines. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('')
      continue
    }
    const words = paragraph.split(/\s+/)
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, size)
      if (width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines.length === 0 ? [''] : lines
}

/**
 * Draw text at position, handling word-wrap automatically.
 * Returns the Y position after the last line.
 */
export function drawText(
  ctx: RenderContext,
  text: string,
  style: TextStyle,
  options?: {
    x?: number
    y?: number
    maxWidth?: number
    align?: 'left' | 'center' | 'right'
    /** If true, auto-paginates when space runs out */
    paginate?: boolean
  }
): number {
  const x = options?.x ?? MARGIN_LEFT
  const maxWidth = options?.maxWidth ?? CONTENT_WIDTH
  const align = options?.align ?? 'left'
  const paginate = options?.paginate ?? true
  const color = style.color ?? COLORS.textPrimary

  const lines = wrapText(text, style.font, style.size, maxWidth)
  let y = options?.y ?? ctx.cursorY

  for (const line of lines) {
    if (paginate && y - style.leading < MARGIN_BOTTOM + 28) {
      addPage(ctx)
      y = ctx.cursorY
    }

    let drawX = x
    if (align === 'center') {
      const w = style.font.widthOfTextAtSize(line, style.size)
      drawX = x + (maxWidth - w) / 2
    } else if (align === 'right') {
      const w = style.font.widthOfTextAtSize(line, style.size)
      drawX = x + maxWidth - w
    }

    if (line !== '') {
      ctx.currentPage.drawText(line, {
        x: drawX,
        y,
        size: style.size,
        font: style.font,
        color,
      })
    }
    y -= style.leading
  }

  ctx.cursorY = y
  return y
}

/** Draw a single line of text at an exact position (no wrapping, no cursor update). */
export function drawTextRaw(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
) {
  page.drawText(text, {
    x,
    y,
    size: style.size,
    font: style.font,
    color: style.color ?? COLORS.textPrimary,
  })
}

// ── Shape drawing ────────────────────────────────────────────────────────────

export function drawRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: {
    color?: ReturnType<typeof rgb>
    borderColor?: ReturnType<typeof rgb>
    borderWidth?: number
  }
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: options?.color,
    borderColor: options?.borderColor,
    borderWidth: options?.borderWidth,
  })
}

export function drawLine(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: { color?: ReturnType<typeof rgb>; thickness?: number }
) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    color: options?.color ?? COLORS.borderDefault,
    thickness: options?.thickness ?? 1,
  })
}

// ── Image drawing ────────────────────────────────────────────────────────────

/**
 * Draw an image at position, preserving aspect ratio within maxWidth × maxHeight.
 * Returns actual drawn { width, height }.
 */
export function drawImage(
  page: PDFPage,
  image: PDFImage,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const imgWidth = image.width
  const imgHeight = image.height
  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1)
  const drawW = imgWidth * scale
  const drawH = imgHeight * scale

  page.drawImage(image, {
    x,
    y: y - drawH,
    width: drawW,
    height: drawH,
  })

  return { width: drawW, height: drawH }
}

/** Draw a grey placeholder box for a failed photo. */
export function drawPlaceholder(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  caption: string,
  font: PDFFont,
) {
  drawRect(page, x, y - height, width, height, { color: COLORS.greyPlaceholder })
  const label = 'Photo unavailable'
  const labelW = font.widthOfTextAtSize(label, 8)
  page.drawText(label, {
    x: x + (width - labelW) / 2,
    y: y - height / 2 - 4,
    size: 8,
    font,
    color: COLORS.textSecondary,
  })
}

// ── Photo fetching ───────────────────────────────────────────────────────────

/** Fetch a photo URL and embed it in the PDF doc. Returns null on failure. */
export async function fetchAndEmbedImage(
  doc: PDFDocument,
  url: string,
): Promise<PDFImage | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Try JPEG first, then PNG
    try {
      return await doc.embedJpg(bytes)
    } catch {
      try {
        return await doc.embedPng(bytes)
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}

// ── Formatting helpers ───────────────────────────────────────────────────────

/** Format pence as £X.XX */
export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

/** Format ISO date string as "DD MMM YYYY" */
export function formatDate(isoDate: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const d = new Date(isoDate)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const month = months[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${day} ${month} ${year}`
}

/** Format ISO datetime as "DD MMM YYYY at HH:MM" */
export function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate)
  const datePart = formatDate(isoDate)
  const hours = d.getUTCHours().toString().padStart(2, '0')
  const minutes = d.getUTCMinutes().toString().padStart(2, '0')
  return `${datePart} at ${hours}:${minutes}`
}

/** Format a PDFAddress as a single string. */
export function formatAddress(addr: { line1: string; line2?: string; town: string; county?: string; postcode: string; country?: string }): string {
  const parts = [addr.line1]
  if (addr.line2) parts.push(addr.line2)
  parts.push(addr.town)
  if (addr.county) parts.push(addr.county)
  parts.push(addr.postcode)
  if (addr.country) parts.push(addr.country)
  return parts.join(', ')
}

// ── Finalize ─────────────────────────────────────────────────────────────────

/** Save the PDF and return a Buffer + page count. */
export async function finalize(ctx: RenderContext): Promise<{ buffer: Buffer; pageCount: number }> {
  const bytes = await ctx.doc.save()
  return {
    buffer: Buffer.from(bytes),
    pageCount: ctx.pages.length,
  }
}
