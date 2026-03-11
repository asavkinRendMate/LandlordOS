/**
 * loadLogo.ts — Load and cache the LetSorted logo as a base64 PNG.
 *
 * Reads /public/logo-white.svg, converts to an all-white PNG using sharp,
 * and caches the result in memory after first load.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'

let cachedBase64: string | undefined

export async function getLogoBase64(): Promise<string> {
  if (cachedBase64) return cachedBase64

  const projectRoot = process.cwd()
  const svgPath = join(projectRoot, 'public', 'logo-white.svg')
  const pngPath = join(projectRoot, 'public', 'logo-white.png')

  // Convert SVG → all-white PNG if not already done
  if (!existsSync(pngPath)) {
    let svgStr = readFileSync(svgPath, 'utf-8')
    // Make all fills white for use on dark backgrounds
    svgStr = svgStr.replace(/fill="#59AA62"/g, 'fill="#ffffff"')
    const svgBuffer = Buffer.from(svgStr)
    const pngBuffer = await sharp(svgBuffer)
      .resize({ height: 88 }) // 4× the 22pt render height for crisp output
      .png()
      .toBuffer()
    writeFileSync(pngPath, pngBuffer)
  }

  const pngBuffer = readFileSync(pngPath)
  cachedBase64 = pngBuffer.toString('base64')
  return cachedBase64
}
