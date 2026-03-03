/**
 * Generates public/og-image.png — the Open Graph image for LetSorted.
 * Run with: node scripts/generate-og.mjs
 */

import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'public', 'og-image.png')

mkdirSync(join(__dirname, '..', 'public'), { recursive: true })

const W = 1200
const H = 630

// SVG drawn at 1200×630, rendered to PNG by sharp/librsvg
const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#163d28"/>
      <stop offset="100%" stop-color="#0f2a1c"/>
    </linearGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#22c55e" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#22c55e" stop-opacity="0.05"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Subtle grid dots -->
  <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
    <circle cx="20" cy="20" r="1" fill="#ffffff" fill-opacity="0.04"/>
  </pattern>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="${W}" height="5" fill="#22c55e" opacity="0.8"/>

  <!-- Glow blob behind text -->
  <ellipse cx="600" cy="310" rx="420" ry="200" fill="#22c55e" opacity="0.06"/>

  <!-- House icon (simple SVG path centred above the text) -->
  <g transform="translate(566, 168) scale(2.8)" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </g>

  <!-- "LetSorted" wordmark -->
  <text
    x="600" y="308"
    text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
    font-size="108"
    font-weight="800"
    letter-spacing="-3"
    fill="#ffffff"
  >LetSorted</text>

  <!-- Divider dot -->
  <circle cx="600" cy="348" r="3" fill="#22c55e" opacity="0.9"/>

  <!-- Tagline -->
  <text
    x="600" y="400"
    text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
    font-size="36"
    font-weight="400"
    letter-spacing="0.5"
    fill="#ffffff"
    fill-opacity="0.65"
  >Your rentals, sorted.</text>

  <!-- Bottom url hint -->
  <text
    x="600" y="570"
    text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
    font-size="22"
    font-weight="400"
    fill="#ffffff"
    fill-opacity="0.3"
    letter-spacing="1"
  >letsorted.co.uk</text>
</svg>
`.trim()

await sharp(Buffer.from(svg))
  .resize(W, H)
  .png({ compressionLevel: 9 })
  .toFile(outPath)

console.log(`✓ OG image written to ${outPath}`)
