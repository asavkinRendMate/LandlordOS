#!/usr/bin/env npx tsx
/**
 * Generate a landlord guide article using Claude AI.
 *
 * Usage:
 *   npx tsx scripts/generate-article.ts "how to screen tenants uk 2025"
 *   npm run generate-article -- "renters rights act what landlords need to know"
 *
 * Requires ANTHROPIC_API_KEY in .env.local or environment.
 */

import fs from 'fs'
import path from 'path'

// Load env from .env.local / .env (no dotenv dependency)
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'))
loadEnvFile(path.join(process.cwd(), '.env'))

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is required. Set it in .env.local')
  process.exit(1)
}

const topic = process.argv[2]
if (!topic) {
  console.error('Usage: npx tsx scripts/generate-article.ts "topic or keyword"')
  process.exit(1)
}

const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides')
const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

const SYSTEM_PROMPT = `You are a UK property law and landlord expert writing SEO-optimised guides for LetSorted (letsorted.co.uk), a property management SaaS for self-managing UK landlords (1-5 properties).

Write in a professional but approachable UK English tone. Use "you" to address the landlord directly. Be practical — give actionable advice, not theory.

Important:
- UK spelling and terminology only (tenancy, not lease; deposit scheme, not escrow)
- Reference current UK law accurately (Renters' Rights Act 2025, Housing Act 1988, Deregulation Act 2015)
- Include practical checklists or step-by-step sections where appropriate
- Mention LetSorted naturally where relevant (tenant screening, document management, compliance tracking) but keep it subtle — max 2 mentions
- Write at least 1500 words
- Use markdown headings (##, ###), lists, blockquotes, and bold for readability
- Do NOT include the h1 title — it comes from frontmatter`

const USER_PROMPT = `Write a comprehensive landlord guide about: "${topic}"

Return your response in this exact format:

---FRONTMATTER---
title: [SEO-optimised title, 50-65 chars]
description: [Meta description, 140-155 chars, includes primary keyword]
slug: [url-friendly-slug]
tags: [comma-separated, 2-4 tags from: Tenant Screening, Compliance, Legal, Property Management, Finance, Renters Rights Act, Right to Rent, Getting Started]
---END FRONTMATTER---

---CONTENT---
[Full MDX article content here — markdown only, no JSX components]
---END CONTENT---`

async function generate() {
  console.log(`\n🖊️  Generating article: "${topic}"`)
  console.log(`   Using model: claude-sonnet-4-20250514\n`)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: USER_PROMPT }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`❌ Claude API error (${res.status}):`, err)
    process.exit(1)
  }

  const data = await res.json()
  const text: string = data.content[0].text

  // Parse frontmatter
  const fmMatch = text.match(/---FRONTMATTER---\s*([\s\S]*?)\s*---END FRONTMATTER---/)
  const contentMatch = text.match(/---CONTENT---\s*([\s\S]*?)\s*---END CONTENT---/)

  if (!fmMatch || !contentMatch) {
    console.error('❌ Failed to parse AI response. Raw output:')
    console.log(text)
    process.exit(1)
  }

  const fmLines = fmMatch[1].trim().split('\n')
  const fm: Record<string, string> = {}
  for (const line of fmLines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    fm[key] = val
  }

  const title = fm.title?.replace(/^["']|["']$/g, '') ?? topic
  const description = fm.description?.replace(/^["']|["']$/g, '') ?? ''
  const slug = fm.slug?.replace(/^["']|["']$/g, '') ?? topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const tagsRaw = fm.tags?.replace(/^\[|\]$/g, '') ?? ''
  const tags = tagsRaw.split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean)

  const articleContent = contentMatch[1].trim()

  // Build MDX file
  const mdxContent = `---
title: "${title}"
description: "${description}"
publishedAt: "${today}"
updatedAt: "${today}"
slug: "${slug}"
tags: [${tags.map((t) => `"${t}"`).join(', ')}]
featured: false
---

${articleContent}
`

  // Write file
  if (!fs.existsSync(GUIDES_DIR)) {
    fs.mkdirSync(GUIDES_DIR, { recursive: true })
  }

  const filePath = path.join(GUIDES_DIR, `${slug}.mdx`)
  if (fs.existsSync(filePath)) {
    console.warn(`⚠️  File already exists: ${filePath}`)
    console.warn(`   Overwriting...`)
  }

  fs.writeFileSync(filePath, mdxContent, 'utf-8')

  console.log(`✅ Article generated!`)
  console.log(`   Title: ${title}`)
  console.log(`   Slug: ${slug}`)
  console.log(`   Tags: ${tags.join(', ')}`)
  console.log(`   File: ${filePath}`)
  console.log(`   URL: /guides/${slug}\n`)
}

generate().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
