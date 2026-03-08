#!/usr/bin/env npx tsx
/**
 * Regenerate CLAUDE.md and SPEC.md by scanning the codebase and calling Claude API.
 *
 * Usage:
 *   npm run update-docs
 *   npx tsx scripts/update-docs.ts
 *
 * Makes 2 API calls (one per doc) to stay within timeout/token limits.
 * Cost: ~$0.10-0.20 per run (Sonnet pricing).
 *
 * Requires ANTHROPIC_API_KEY in .env.local or environment.
 */

import fs from 'fs'
import path from 'path'
import https from 'https'

// ── Env loading (same pattern as generate-article.ts, no dotenv) ──────────────

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

const ROOT = process.cwd()
loadEnvFile(path.join(ROOT, '.env.local'))
loadEnvFile(path.join(ROOT, '.env'))

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is required. Set it in .env.local')
  process.exit(1)
}

// ── Part 1: Project Scanner ───────────────────────────────────────────────────

const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.git', '.vercel', '.DS_Store'])

function buildTree(dir: string, depth: number, maxDepth: number, prefix = ''): string {
  if (depth > maxDepth) return ''
  let result = ''
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return ''
  }
  const filtered = entries
    .filter((e) => !EXCLUDE_DIRS.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i]
    const isLast = i === filtered.length - 1
    const connector = isLast ? '└── ' : '├── '
    const childPrefix = isLast ? '    ' : '│   '

    if (entry.isDirectory()) {
      result += `${prefix}${connector}${entry.name}/\n`
      result += buildTree(path.join(dir, entry.name), depth + 1, maxDepth, prefix + childPrefix)
    } else {
      result += `${prefix}${connector}${entry.name}\n`
    }
  }
  return result
}

function getDirectoryTree(): string {
  const dirs = ['app', 'lib', 'components', 'scripts', 'prisma', 'supabase']
  let tree = ''
  for (const d of dirs) {
    const fullPath = path.join(ROOT, d)
    if (!fs.existsSync(fullPath)) continue
    tree += `${d}/\n`
    tree += buildTree(fullPath, 0, 2, '')
    tree += '\n'
  }
  return tree.trim()
}

function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = []
  function walk(d: string) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name)) continue
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (pattern.test(entry.name)) {
        results.push(full)
      }
    }
  }
  walk(dir)
  return results.sort()
}

function extractHttpMethods(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const methods: string[] = []
  const methodPattern = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/g
  let match
  while ((match = methodPattern.exec(content)) !== null) {
    methods.push(match[1])
  }
  return methods
}

function getApiRoutes(): string {
  const apiDir = path.join(ROOT, 'app', 'api')
  const routeFiles = findFiles(apiDir, /^route\.ts$/)
  const routes: string[] = []

  for (const file of routeFiles) {
    const relative = path.relative(apiDir, file)
    const apiPath = '/api/' + path.dirname(relative).replace(/\\/g, '/').replace(/\[([^\]]+)\]/g, ':$1')
    const methods = extractHttpMethods(file)
    if (methods.length > 0) {
      routes.push(`${methods.join(', ')} ${apiPath}`)
    } else {
      routes.push(`??? ${apiPath}`)
    }
  }

  return routes.join('\n')
}

function getPages(): string {
  const appDir = path.join(ROOT, 'app')
  const pageFiles = findFiles(appDir, /^page\.tsx$/)
  const pages: string[] = []

  for (const file of pageFiles) {
    const relative = path.relative(appDir, file)
    const dir = path.dirname(relative).replace(/\\/g, '/')

    const urlPath = '/' + dir
      .replace(/\(([^)]+)\)\//g, '')
      .replace(/\(([^)]+)\)$/g, '')
      .replace(/\/page\.tsx$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1')

    const groupMatch = dir.match(/^\(([^)]+)\)/)
    const group = groupMatch ? groupMatch[1] : 'root'

    pages.push(`[${group}] ${urlPath || '/'}`)
  }

  return pages.join('\n')
}

function readFileOr(filePath: string, fallback: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return fallback
  }
}

function getEnvVars(): string {
  const examplePath = path.join(ROOT, '.env.example')
  if (fs.existsSync(examplePath)) {
    return fs.readFileSync(examplePath, 'utf-8')
  }

  // Fallback: extract just keys from .env.local (never values)
  const envLocalPath = path.join(ROOT, '.env.local')
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8')
    const keys: string[] = []
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        keys.push(trimmed)
        continue
      }
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1) {
        keys.push(`${trimmed.slice(0, eqIdx).trim()}=`)
      }
    }
    return keys.join('\n')
  }

  return '(no .env.example or .env.local found)'
}

function getDependencies(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
  const deps = Object.entries(pkg.dependencies || {}).map(([k, v]) => `  ${k}: ${v}`)
  const devDeps = Object.entries(pkg.devDependencies || {}).map(([k, v]) => `  ${k}: ${v}`)
  return `dependencies:\n${deps.join('\n')}\n\ndevDependencies:\n${devDeps.join('\n')}`
}

interface ScanResult {
  directoryTree: string
  apiRoutes: string
  pages: string
  schema: string
  dependencies: string
  envVars: string
  currentClaudeMd: string
  currentSpecMd: string
}

function scanProject(): ScanResult {
  console.log('📂 Scanning project structure...')
  const directoryTree = getDirectoryTree()

  console.log('🔌 Extracting API routes...')
  const apiRoutes = getApiRoutes()

  console.log('📄 Extracting pages...')
  const pages = getPages()

  console.log('🗄️  Reading database schema...')
  const schema = readFileOr(path.join(ROOT, 'prisma', 'schema.prisma'), '(schema not found)')

  console.log('📦 Reading dependencies...')
  const dependencies = getDependencies()

  console.log('🔑 Reading environment variables...')
  const envVars = getEnvVars()

  console.log('📝 Reading current docs...')
  const currentClaudeMd = readFileOr(path.join(ROOT, 'CLAUDE.md'), '')
  const currentSpecMd = readFileOr(path.join(ROOT, 'SPEC.md'), '')

  return { directoryTree, apiRoutes, pages, schema, dependencies, envVars, currentClaudeMd, currentSpecMd }
}

// ── Part 1b: Protected Notes ─────────────────────────────────────────────────

const PROTECTED_MARKER = '## PROTECTED NOTES'

function extractProtectedNotes(content: string): string {
  const idx = content.indexOf(PROTECTED_MARKER)
  if (idx === -1) return ''
  return content.slice(idx)
}

const WARNING_KEYWORDS = [
  'IMPORTANT',
  'WARNING',
  'GOTCHA',
  'DO NOT',
  'NEVER',
  'ALWAYS',
  'CRITICAL',
  'HACK',
  'WORKAROUND',
  'FIXME',
]

function findWarningLines(content: string): string[] {
  const lines: string[] = []
  for (const line of content.split('\n')) {
    const upper = line.toUpperCase()
    // Skip the protected notes section itself and blank/header-only lines
    if (!line.trim() || line.startsWith('#')) continue
    if (WARNING_KEYWORDS.some((kw) => upper.includes(kw))) {
      lines.push(line)
    }
  }
  return lines
}

function rescueMissingWarnings(oldContent: string, newContent: string): string[] {
  // Only scan the non-protected portion of the old doc
  const protectedIdx = oldContent.indexOf(PROTECTED_MARKER)
  const oldMain = protectedIdx !== -1 ? oldContent.slice(0, protectedIdx) : oldContent

  const oldWarnings = findWarningLines(oldMain)
  const rescued: string[] = []

  for (const line of oldWarnings) {
    if (!newContent.includes(line)) {
      rescued.push(line)
    }
  }

  return rescued
}

// ── Part 2: Claude API Calls ──────────────────────────────────────────────────

function buildScanContext(scan: ScanResult): string {
  return `PROJECT STRUCTURE:
${scan.directoryTree}

API ROUTES:
${scan.apiRoutes}

PAGES:
${scan.pages}

DATABASE SCHEMA:
${scan.schema}

DEPENDENCIES:
${scan.dependencies}

ENV VARS:
${scan.envVars}`
}

const CLAUDE_MD_SYSTEM = `You are a technical documentation writer for a Next.js SaaS codebase called LetSorted (UK property management for self-managing landlords).

Generate a CLAUDE.md file — project instructions for AI coding assistants.

Required sections:
- Project Overview (brief, with product name and domain)
- Tech Stack (table format)
- Project Structure (full tree from the scan)
- Database Schema (all Prisma models with key fields, enums, relations — use prisma code blocks)
- Feature Status (table: feature | status | notes)
- AI Financial Scoring Engine (flow, scoring rules, JSON extraction safety, candidate view)
- Screening Pricing (invite flow + credit pack pricing table)
- Email System (architecture, base template, template functions table, helpers)
- Key Commands (dev, DB, build commands as code block)
- Code Conventions (general, API routes, components, storage, rent payments, maintenance, error handling)
- Environment Variables (table or code block with descriptions)
- Important Business Rules (all domain-specific rules)
- What NOT to Do (security and domain pitfalls)

Rules:
- Be accurate — only document what exists in the codebase scan
- Be concise — no filler, no generic advice
- Preserve the existing structure and content where still accurate
- Update routes, models, pages, deps to match the scan
- Use markdown: tables, code blocks, headers
- This is the AUTHORITATIVE reference for AI assistants — be precise and specific
- If PROTECTED CONTENT is provided, you MUST include it EXACTLY as-is at the very end of the generated CLAUDE.md. Do not modify, summarize, or remove any of it.

Return ONLY the full markdown content for CLAUDE.md. No preamble, no wrapping.`

const SPEC_MD_SYSTEM = `You are a technical documentation writer for a Next.js SaaS codebase called LetSorted (UK property management for self-managing landlords).

Generate a SPEC.md file — product specification.

Required sections:
- Product Vision & Target User
- Pricing Model
- Feature List with Status (LIVE / BETA / NOT STARTED / PRE-LAUNCH)
- User Flows (landlord onboarding, tenant lifecycle, screening flow)
- Technical Architecture (stack, hosting, auth, storage, payments)
- Compliance & Legal (Renters' Rights Act 2025, deposit rules, Awaab's Law)

Rules:
- Be accurate — only document what exists in the codebase scan
- Be concise — focus on product-specific decisions
- Preserve existing structure where still accurate
- Audience: product manager or new developer onboarding
- Use markdown: tables, flow diagrams (text-based), headers

Return ONLY the full markdown content for SPEC.md. No preamble, no wrapping.`

async function callClaudeAPI(
  systemPrompt: string,
  userPrompt: string,
  label: string,
): Promise<string> {
  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 12000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const payloadKB = Math.round(Buffer.byteLength(body) / 1024)
  console.log(`   [${label}] Payload: ${payloadKB} KB`)

  const data = await new Promise<{ content: Array<{ text: string }>; usage?: { input_tokens?: number; output_tokens?: number } }>((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        timeout: 300_000,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf-8')
          if (res.statusCode !== 200) {
            reject(new Error(`Claude API error (${res.statusCode}): ${responseBody.slice(0, 500)}`))
            return
          }
          try {
            resolve(JSON.parse(responseBody))
          } catch {
            reject(new Error(`Failed to parse API response for ${label}`))
          }
        })
      },
    )
    req.on('error', (err) => reject(new Error(`Network error (${label}): ${err.message}`)))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error(`${label} request timed out after 5 minutes`))
    })
    req.write(body)
    req.end()
  })

  const usage = data.usage
  if (usage) {
    console.log(`   [${label}] Tokens: ${usage.input_tokens} in, ${usage.output_tokens} out`)
  }

  return data.content[0].text
}

interface GenerateResult {
  claudeMd: string
  specMd: string
  protectedLineCount: number
  rescuedLines: string[]
}

async function generateDocs(scan: ScanResult): Promise<GenerateResult> {
  const scanContext = buildScanContext(scan)

  // Extract protected notes before regeneration
  const protectedSection = extractProtectedNotes(scan.currentClaudeMd)
  const protectedLineCount = protectedSection ? protectedSection.split('\n').length : 0
  if (protectedSection) {
    console.log(`\n🛡️  Protected notes: ${protectedLineCount} lines extracted`)
  }

  // Strip protected section from the current doc sent to the API
  // (it will be re-appended verbatim after generation)
  const currentClaudeMdWithoutProtected = protectedSection
    ? scan.currentClaudeMd.slice(0, scan.currentClaudeMd.indexOf(PROTECTED_MARKER)).trimEnd()
    : scan.currentClaudeMd

  // Call 1: CLAUDE.md
  console.log('\n🤖 Generating CLAUDE.md...')
  let claudePrompt = `Here is the current codebase scan and the existing CLAUDE.md. Generate an updated CLAUDE.md.

${scanContext}

CURRENT CLAUDE.md:
${currentClaudeMdWithoutProtected}`

  if (protectedSection) {
    claudePrompt += `

PROTECTED CONTENT — you MUST include this exactly as-is at the end of the generated CLAUDE.md. Do not modify, summarize, or remove any of it:

${protectedSection}`
  }

  let claudeMd: string
  try {
    claudeMd = await callClaudeAPI(CLAUDE_MD_SYSTEM, claudePrompt, 'CLAUDE.md')
  } catch (err) {
    const outputDir = path.join(ROOT, 'scripts', 'output')
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
    console.error(`   ❌ CLAUDE.md generation failed: ${err instanceof Error ? err.message : err}`)
    throw err
  }

  // Ensure protected section is present (force-append if AI dropped it)
  if (protectedSection && !claudeMd.includes(PROTECTED_MARKER)) {
    claudeMd = claudeMd.trimEnd() + '\n\n---\n\n' + protectedSection
    console.log('   🛡️  Protected notes were missing from AI output — force-appended')
  }

  // Rescue warning lines that were lost during regeneration
  const rescued = rescueMissingWarnings(scan.currentClaudeMd, claudeMd)
  if (rescued.length > 0) {
    // Find the protected notes section in the generated doc and append rescued lines
    const protIdx = claudeMd.indexOf(PROTECTED_MARKER)
    if (protIdx !== -1) {
      const before = claudeMd.slice(0, claudeMd.length).trimEnd()
      const rescuedBlock = rescued.map((l) => `${l}  <!-- Auto-preserved by update-docs -->`).join('\n')
      claudeMd = before + '\n\n' + rescuedBlock + '\n'
    }
    console.log(`   ⚠️  Preserved ${rescued.length} important notes that were missing from regeneration`)
  }

  // Call 2: SPEC.md
  console.log('\n🤖 Generating SPEC.md...')
  const specPrompt = `Here is the current codebase scan and the existing SPEC.md. Generate an updated SPEC.md.

${scanContext}

CURRENT SPEC.md:
${scan.currentSpecMd}`

  let specMd: string
  try {
    specMd = await callClaudeAPI(SPEC_MD_SYSTEM, specPrompt, 'SPEC.md')
  } catch (err) {
    const outputDir = path.join(ROOT, 'scripts', 'output')
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
    console.error(`   ❌ SPEC.md generation failed: ${err instanceof Error ? err.message : err}`)
    throw err
  }

  return { claudeMd, specMd, protectedLineCount, rescuedLines: rescued }
}

// ── Part 3: Diff + Write ─────────────────────────────────────────────────────

interface DiffSummary {
  added: number
  removed: number
  sections: string[]
}

function computeDiff(oldContent: string, newContent: string): DiffSummary {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  let added = 0
  let removed = 0
  for (const line of newLines) {
    if (!oldSet.has(line)) added++
  }
  for (const line of oldLines) {
    if (!newSet.has(line)) removed++
  }

  const oldHeaders = oldLines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3).trim())
  const newHeaders = newLines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3).trim())

  const changedSections: string[] = []
  const allHeaders = Array.from(new Set([...oldHeaders, ...newHeaders]))
  for (const header of allHeaders) {
    const inOld = oldHeaders.includes(header)
    const inNew = newHeaders.includes(header)
    if (!inOld && inNew) {
      changedSections.push(`+ ${header}`)
    } else if (inOld && !inNew) {
      changedSections.push(`- ${header}`)
    }
  }

  if (changedSections.length === 0 && (added > 0 || removed > 0)) {
    changedSections.push('content updated within existing sections')
  }

  return { added, removed, sections: changedSections }
}

function writeDoc(filePath: string, content: string, label: string): DiffSummary | null {
  const oldContent = readFileOr(filePath, '')
  if (oldContent === content) {
    console.log(`   ${label}: no changes`)
    return null
  }

  const diff = computeDiff(oldContent, content)
  fs.writeFileSync(filePath, content, 'utf-8')
  return diff
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now()
  console.log('🔄 LetSorted Documentation Updater\n')

  const scan = scanProject()

  const result = await generateDocs(scan)

  console.log('\n💾 Writing files...\n')

  const claudeDiff = writeDoc(path.join(ROOT, 'CLAUDE.md'), result.claudeMd, 'CLAUDE.md')
  const specDiff = writeDoc(path.join(ROOT, 'SPEC.md'), result.specMd, 'SPEC.md')

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  console.log(`\n✅ Documentation updated — ${timestamp} (${elapsed}s)\n`)

  if (claudeDiff) {
    console.log(`   CLAUDE.md: +${claudeDiff.added} lines, -${claudeDiff.removed} lines`)
    if (claudeDiff.sections.length > 0) {
      console.log(`   Changes: ${claudeDiff.sections.join(', ')}`)
    }
  } else {
    console.log('   CLAUDE.md: unchanged')
  }

  if (specDiff) {
    console.log(`   SPEC.md:  +${specDiff.added} lines, -${specDiff.removed} lines`)
    if (specDiff.sections.length > 0) {
      console.log(`   Changes: ${specDiff.sections.join(', ')}`)
    }
  } else {
    console.log('   SPEC.md:  unchanged')
  }

  console.log(`   Protected notes: ${result.protectedLineCount} lines preserved`)
  console.log(`   Auto-rescued notes: ${result.rescuedLines.length} lines`)

  console.log('\n   Files written:')
  if (claudeDiff) console.log('   → CLAUDE.md')
  if (specDiff) console.log('   → SPEC.md')
  if (!claudeDiff && !specDiff) console.log('   (no files changed)')
  console.log()
}

main().catch((err) => {
  console.error('❌ Error:', err.message || err)
  process.exit(0) // Exit 0 unless API key missing (which exits 1 above)
})
