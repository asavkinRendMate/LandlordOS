/**
 * loadLogo.ts — Load and cache the LetSorted logo PNG for PDF headers.
 *
 * Reads public/logo-pdf.png (white logo, 400×114px) and returns it
 * as a base64 string for embedding via pdf-lib.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

let cachedBase64: string | undefined

export async function getLogoBase64(): Promise<string> {
  if (cachedBase64) return cachedBase64

  const pngPath = join(process.cwd(), 'public', 'logo-pdf.png')
  const pngBuffer = readFileSync(pngPath)
  cachedBase64 = pngBuffer.toString('base64')
  return cachedBase64
}
