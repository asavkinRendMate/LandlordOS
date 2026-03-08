import { Prisma } from '@prisma/client'
import { PDFDocument } from 'pdf-lib'
import { prisma } from '@/lib/prisma'
import { getSignedUrl } from '@/lib/storage'
import { env } from '@/lib/env'

const BUCKET = 'bank-statements'
const COMPRESS_THRESHOLD = 2 * 1024 * 1024 // 2 MB
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000

/** Strip chain-of-thought / scoring working from AI summary before saving. */
function cleanSummary(summary: string): string {
  const cutoff = summary.indexOf('Starting score:')
  if (cutoff !== -1) {
    return summary.substring(0, cutoff).trim()
  }
  const patterns = [
    /\s*Score calculation:[\s\S]*$/,
    /\s*Applied:[\s\S]*$/,
    /\s*Deductions:[\s\S]*$/,
    /\s*Final score:[\s\S]*$/,
    /\s*Running total:[\s\S]*$/,
  ]
  let clean = summary
  for (const pattern of patterns) {
    clean = clean.replace(pattern, '')
  }
  return clean.trim()
}

// ── Module-level cache for formatted rules string ────────────────────────────
// Built once on first use per server lifetime, not per request.

let cachedRulesCompact: string | null = null
let cachedRuleMap: Map<string, { key: string; description: string; points: number; category: string }> | null = null

async function getRulesCompact(): Promise<{
  rulesText: string
  ruleMap: Map<string, { key: string; description: string; points: number; category: string }>
}> {
  if (cachedRulesCompact && cachedRuleMap) {
    return { rulesText: cachedRulesCompact, ruleMap: cachedRuleMap }
  }

  const rules = await prisma.scoringRule.findMany({ where: { isActive: true } })
  if (rules.length === 0) throw new Error('No active scoring rules found')

  // Log rules loaded from DB
  const first3 = rules.slice(0, 3).map((r) => `${r.key}(${r.points >= 0 ? '+' : ''}${r.points})`)
  console.log(`[scoring] Rules loaded: ${rules.length} rules, showing first 3: ${first3.join(', ')}`)

  // Build mandatory deduction/bonus format with descriptions
  const penalties = rules.filter((r) => r.points < 0)
  const bonuses = rules.filter((r) => r.points > 0)
  const neutral = rules.filter((r) => r.points === 0)

  const mandatoryDeductions = penalties
    .map((r) => `- ${r.key}: DEDUCT ${Math.abs(r.points)} points — "${r.description}". This is non-negotiable regardless of other positive factors.`)
    .join('\n')

  const mandatoryBonuses = bonuses
    .map((r) => `- ${r.key}: ADD ${r.points} points — "${r.description}"`)
    .join('\n')

  const neutralRules = neutral
    .map((r) => `- ${r.key}: 0 points — "${r.description}"`)
    .join('\n')

  cachedRulesCompact = `SCORING SYSTEM — NON-NEGOTIABLE RULES
You MUST apply the following deductions and bonuses. These are MANDATORY, not guidelines.
The score starts at 100. Apply all matching rules. No exceptions. No leniency.

MANDATORY DEDUCTIONS (apply ALL that match — do not skip any):
${mandatoryDeductions}

MANDATORY BONUSES (apply ALL that match):
${mandatoryBonuses}

${neutralRules ? `NEUTRAL (fire but 0 points):\n${neutralRules}\n` : ''}
CRITICAL: You must fire EVERY rule whose condition is met. Do not omit deductions because the applicant has positive factors. Deductions and bonuses are independent — apply both.

Show your working in the summary like:
"Starting score: 100. Applied: REGULAR_INCOME_PATTERN(+10)=110, RENT_35_TO_40_PCT(-15)=95, GAMBLING_ANY(-10)=85. Final: 85/100."
This working MUST appear at the end of your summary.`

  cachedRuleMap = new Map(
    rules.map((r) => [r.key, { key: r.key, description: r.description, points: r.points, category: r.category }]),
  )

  return { rulesText: cachedRulesCompact, ruleMap: cachedRuleMap }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatementFile {
  index: number
  fileName: string
  storagePath: string
  fileSize: number
  verificationStatus: 'PENDING' | 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN'
  detectedName?: string | null
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  reason?: string
  relationship?: string | null
  removedByApplicant?: boolean
}

interface NameVerificationResult {
  foundName: string | null
  verification: 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  periodStart: string | null
  periodEnd: string | null
}

interface JointApplicant {
  name: string
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN'
  income?: number | null
  fileIndices: number[]
}

type CoverageStatus = 'PASS' | 'WARN_SHORT' | 'WARN_OLD' | 'WARN_BOTH' | 'UNKNOWN'

interface PersonValidation {
  name: string
  isApplicant: boolean
  fileIndices: number[]
  periodStart: string | null
  periodEnd: string | null
  coverageDays: number | null
  coverageStatus: CoverageStatus
}

// ── Grade thresholds ───────────────────────────────────────────────────────────

function scoreToGrade(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 45) return 'Poor'
  return 'High Risk'
}

// ── Gambling stacking: only apply highest gambling penalty ────────────────────

function deduplicateStackingRules(firedKeys: string[]): string[] {
  // Gambling: only highest penalty
  const hasAbove10 = firedKeys.includes('GAMBLING_ABOVE_10_PCT')
  const hasAbove5  = firedKeys.includes('GAMBLING_ABOVE_5_PCT')

  // Income discrepancy: only highest penalty
  const hasMajor = firedKeys.includes('INCOME_MAJOR_DISCREPANCY')
  const hasSignificant = firedKeys.includes('INCOME_SIGNIFICANT_DISCREPANCY')

  return firedKeys.filter((key) => {
    // Gambling dedup
    if (key === 'GAMBLING_ABOVE_5_PCT' && hasAbove10) return false
    if (key === 'GAMBLING_ANY' && (hasAbove10 || hasAbove5)) return false
    // Income discrepancy dedup
    if (key === 'INCOME_SIGNIFICANT_DISCREPANCY' && hasMajor) return false
    if (key === 'INCOME_SLIGHT_DISCREPANCY' && (hasMajor || hasSignificant)) return false
    return true
  })
}

// ── Download a PDF from storage as Buffer ────────────────────────────────────

async function downloadPdfBuffer(storagePath: string): Promise<Buffer> {
  const signedUrl = await getSignedUrl(storagePath, 300, BUCKET)
  const pdfResponse = await fetch(signedUrl)
  if (!pdfResponse.ok) throw new Error(`Failed to download PDF: ${pdfResponse.status}`)
  return Buffer.from(await pdfResponse.arrayBuffer())
}

// ── PDF compression using pdf-lib ────────────────────────────────────────────

async function compressPdf(buffer: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const compressed = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  })
  return Buffer.from(compressed)
}

// ── Split PDF into two halves ────────────────────────────────────────────────

async function splitPdfInHalf(buffer: Buffer): Promise<[Buffer, Buffer]> {
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const totalPages = srcDoc.getPageCount()
  const midpoint = Math.ceil(totalPages / 2)

  const firstDoc = await PDFDocument.create()
  const firstPages = await firstDoc.copyPages(srcDoc, Array.from({ length: midpoint }, (_, i) => i))
  for (const page of firstPages) firstDoc.addPage(page)

  const secondDoc = await PDFDocument.create()
  const secondPages = await secondDoc.copyPages(srcDoc, Array.from({ length: totalPages - midpoint }, (_, i) => midpoint + i))
  for (const page of secondPages) secondDoc.addPage(page)

  const [firstBytes, secondBytes] = await Promise.all([
    firstDoc.save({ useObjectStreams: true }),
    secondDoc.save({ useObjectStreams: true }),
  ])

  return [Buffer.from(firstBytes), Buffer.from(secondBytes)]
}

// ── Prepare a PDF: compress if >2MB, split if still >2MB ─────────────────────

async function preparePdf(buffer: Buffer): Promise<Buffer[]> {
  if (buffer.length <= COMPRESS_THRESHOLD) return [buffer]

  const compressed = await compressPdf(buffer)
  console.log(`[scoring/engine] Compressed PDF from ${(buffer.length / 1024 / 1024).toFixed(1)}MB to ${(compressed.length / 1024 / 1024).toFixed(1)}MB`)

  if (compressed.length <= COMPRESS_THRESHOLD) return [compressed]

  // Still too large — split into halves
  console.log(`[scoring/engine] PDF still ${(compressed.length / 1024 / 1024).toFixed(1)}MB after compression, splitting in half`)
  const [first, second] = await splitPdfInHalf(compressed)
  return [first, second]
}

// ── Name verification + period extraction per file ──────────────────────────

async function verifyName(
  pdfBase64: string,
  applicantName: string,
  apiKey: string,
): Promise<NameVerificationResult> {
  console.log(`[screening:ai] Name verification — applicantName="${applicantName}", PDF size=${(pdfBase64.length * 0.75 / 1024).toFixed(0)}KB`)
  const verifySystem = 'You are analysing a bank statement. Respond ONLY with valid JSON.'
  const verifyUserText = `Extract the account holder name and statement period from this bank statement. Determine whether the name matches the applicant name "${applicantName}".

Respond with ONLY a JSON object in this exact format:
{
  "foundName": "Name found on the statement or null if unreadable",
  "verification": "VERIFIED|UNVERIFIED|UNCERTAIN",
  "confidence": "HIGH|MEDIUM|LOW",
  "reason": "Brief explanation of the verification result",
  "periodStart": "YYYY-MM-DD or null if not found",
  "periodEnd": "YYYY-MM-DD or null if not found"
}

Rules:
- VERIFIED: The name on the statement clearly matches "${applicantName}" (allow minor variations like middle names, initials, married names)
- UNVERIFIED: The name on the statement is clearly different from "${applicantName}"
- UNCERTAIN: The name is unreadable, the document is unclear, or you cannot make a confident determination
- confidence reflects how clearly you could read and match the name
- periodStart/periodEnd: the date range the statement covers (e.g. "2025-09-01" to "2025-09-30"). Extract from headers like "Statement from X to Y" or infer from the first and last transaction dates. Use null if not determinable.`

  const vSysChars = verifySystem.length
  const vUserChars = verifyUserText.length
  console.log(`[scoring/engine] Name verify prompt estimate — system: ${vSysChars} chars (~${Math.ceil(vSysChars / 4)} tokens), user: ${vUserChars} chars (~${Math.ceil(vUserChars / 4)} tokens), documents: 1, est total text tokens: ~${Math.ceil((vSysChars + vUserChars) / 4)}`)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: verifySystem,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: verifyUserText,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`[screening:ai] Name verification API error ${response.status}: ${text.substring(0, 200)}`)
    // 429 = rate limit — propagate as a specific error
    if (response.status === 429) {
      throw new RateLimitError(`Rate limited by Claude API: ${text}`)
    }
    throw new Error(`Claude API error ${response.status}: ${text}`)
  }

  const result = await response.json() as {
    content: Array<{ type: string; text?: string }>
  }

  const textBlock = result.content.find((b) => b.type === 'text')
  if (!textBlock?.text) throw new Error('No text response from Claude for name verification')

  let jsonStr = textBlock.text.trim()
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    const firstBrace = jsonStr.indexOf('{')
    const lastBrace = jsonStr.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
    }
  }
  const parsed = JSON.parse(jsonStr) as NameVerificationResult
  console.log(`[screening:ai] Name verification result — foundName="${parsed.foundName}", verification=${parsed.verification}, confidence=${parsed.confidence}, period=${parsed.periodStart}→${parsed.periodEnd}, reason="${parsed.reason}"`)
  return parsed
}

// ── Rate limit error class ──────────────────────────────────────────────────

class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

// ── Coverage validation ─────────────────────────────────────────────────────

function validateCoverage(periodStart: string | null, periodEnd: string | null): { coverageDays: number | null; coverageStatus: CoverageStatus } {
  if (!periodStart || !periodEnd) {
    return { coverageDays: null, coverageStatus: 'UNKNOWN' }
  }

  const start = new Date(periodStart)
  const end = new Date(periodEnd)
  const now = new Date()

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { coverageDays: null, coverageStatus: 'UNKNOWN' }
  }

  const coverageDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const isOld = (now.getTime() - end.getTime()) > SIX_MONTHS_MS
  const isShort = coverageDays < 60 // less than ~2 months

  if (isShort && isOld) return { coverageDays, coverageStatus: 'WARN_BOTH' }
  if (isShort) return { coverageDays, coverageStatus: 'WARN_SHORT' }
  if (isOld) return { coverageDays, coverageStatus: 'WARN_OLD' }
  return { coverageDays, coverageStatus: 'PASS' }
}

// ── Claude analysis response type ────────────────────────────────────────────

interface ClaudeAnalysisResponse {
  firedRules: string[]
  monthlyIncome: number
  averageBalance: number
  rentToIncomeRatio: number
  summary: string
  currency: string
  analysedMonths: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  isJointApplication?: boolean
  jointApplicants?: Array<{
    name: string
    income: number | null
  }>
  incomeBreakdown?: Array<{
    name: string
    monthlyIncome: number
  }>
  warnings?: string[]
}

// ── Synthesis call: merge two half-analyses ──────────────────────────────────

async function synthesizeHalves(
  resultA: ClaudeAnalysisResponse,
  resultB: ClaudeAnalysisResponse,
  monthlyRentPence: number,
  rulesText: string,
  apiKey: string,
): Promise<ClaudeAnalysisResponse> {
  const rentPounds = (monthlyRentPence / 100).toFixed(2)

  console.log(`[screening:ai] Synthesis call — merging two halves, rent=£${rentPounds}`)
  console.log(`[screening:ai] Half A: income=£${resultA.monthlyIncome}, balance=£${resultA.averageBalance}, firedRules=[${resultA.firedRules.join(', ')}]`)
  console.log(`[screening:ai] Half B: income=£${resultB.monthlyIncome}, balance=£${resultB.averageBalance}, firedRules=[${resultB.firedRules.join(', ')}]`)

  const systemPrompt = 'You are a financial analyst. Merge two partial bank statement analyses into one combined result. Respond ONLY with valid JSON.'

  const userPrompt = `Two halves of the same bank statement were analysed separately. Merge them into one combined analysis. Monthly rent: £${rentPounds}.

Half A:
${JSON.stringify(resultA)}

Half B:
${JSON.stringify(resultB)}

Return the same JSON format:
{"firedRules":["KEY"],"monthlyIncome":"<CALCULATED_GBP>","averageBalance":"<CALCULATED_GBP>","rentToIncomeRatio":"<CALCULATED_DECIMAL>","summary":"3-4 sentences.","currency":"GBP","analysedMonths":"<NUMBER>","confidence":"HIGH|MEDIUM|LOW","isJointApplication":false,"jointApplicants":[],"incomeBreakdown":[],"warnings":[]}

CRITICAL: Replace all angle-bracket placeholders with actual calculated numeric values. Never return zero unless the statements genuinely show zero.

Rules (fire key if pattern detected):
${rulesText}

Notes: De-duplicate firedRules. Average the averageBalance. Sum monthly income correctly (don't double count). Only fire the single highest gambling rule. Recalculate rentToIncomeRatio from combined income.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`[screening:ai] Synthesis API error ${response.status}: ${text.substring(0, 200)}`)
    if (response.status === 429) throw new RateLimitError(`Rate limited by Claude API: ${text}`)
    throw new Error(`Claude API error ${response.status}: ${text}`)
  }

  const result = await response.json() as { content: Array<{ type: string; text?: string }> }
  const textBlock = result.content.find((b) => b.type === 'text')
  if (!textBlock?.text) throw new Error('No text response from Claude for synthesis')

  console.log(`[screening:ai] Synthesis raw response (first 500 chars): ${textBlock.text.substring(0, 500)}`)

  let jsonStr = textBlock.text.trim()
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  if (!jsonStr.startsWith('{')) {
    const firstBrace = jsonStr.indexOf('{')
    const lastBrace = jsonStr.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
    }
  }
  const parsed = JSON.parse(jsonStr) as ClaudeAnalysisResponse

  // Coerce numeric fields — AI sometimes returns strings instead of numbers
  parsed.monthlyIncome = parseFloat(String(parsed.monthlyIncome ?? '0')) || 0
  parsed.averageBalance = parseFloat(String(parsed.averageBalance ?? '0')) || 0
  parsed.rentToIncomeRatio = parseFloat(String(parsed.rentToIncomeRatio ?? '0')) || 0
  parsed.analysedMonths = parseFloat(String(parsed.analysedMonths ?? '0')) || 0
  if (parsed.incomeBreakdown) {
    parsed.incomeBreakdown = parsed.incomeBreakdown.map((p) => ({
      ...p,
      monthlyIncome: parseFloat(String(p.monthlyIncome ?? '0')) || 0,
    }))
  }

  console.log(`[screening:ai] Synthesis result — income=£${parsed.monthlyIncome}, balance=£${parsed.averageBalance}, firedRules=[${parsed.firedRules.join(', ')}]`)
  return parsed
}

// ── Main analysis call (supports multiple PDFs) ──────────────────────────────

async function callClaudeAnalysis(
  pdfFiles: Array<{ base64: string; fileName: string; ownershipNote: string }>,
  monthlyRentPence: number,
  rulesText: string,
  apiKey: string,
  declaredIncomePence?: number | null,
  declaredJointApplication?: boolean,
): Promise<ClaudeAnalysisResponse> {
  const rentPounds = (monthlyRentPence / 100).toFixed(2)
  const declaredIncomePounds = declaredIncomePence ? (declaredIncomePence / 100).toFixed(2) : null

  // Build document blocks for each PDF
  const documentBlocks: Array<Record<string, unknown>> = []
  for (const pdf of pdfFiles) {
    documentBlocks.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdf.base64,
      },
    })
    documentBlocks.push({
      type: 'text',
      text: `[File: ${pdf.fileName}] ${pdf.ownershipNote}`,
    })
  }

  const ownershipSummary = pdfFiles
    .map((f) => `- ${f.fileName}: ${f.ownershipNote}`)
    .join('\n')

  const systemPrompt = `You are a strict financial compliance analyst reviewing bank statements for a UK rental property. You MUST apply scoring rules mechanically — every rule whose condition is met MUST be fired. You are not allowed to exercise leniency or skip penalties. Respond ONLY with valid JSON.`

  const jointContext = declaredJointApplication
    ? `\nJoint application: YES (declared by applicant). Statements may belong to different people — treat as household income.\n`
    : `\nJoint application: NO (single applicant).\n`

  const userPrompt = `Analyse these bank statements. Monthly rent: £${rentPounds}.
${jointContext}
Files:
${ownershipSummary}

Return JSON:
{"firedRules":["KEY"],"monthlyIncome":"<CALCULATED_GBP>","averageBalance":"<CALCULATED_GBP>","rentToIncomeRatio":"<CALCULATED_DECIMAL>","summary":"3-4 sentences on financial health, strengths, risks, recommendation. Do NOT include scoring calculations or working in this field.","scoreBreakdown":"Starting score: 100. Applied: RULE(+/-X)=Y, ... Final: Z/100.","currency":"GBP","analysedMonths":"<NUMBER>","confidence":"HIGH|MEDIUM|LOW","isJointApplication":false,"jointApplicants":[{"name":"","income":"<CALCULATED_GBP>"}],"incomeBreakdown":[{"name":"","monthlyIncome":"<CALCULATED_GBP>"}],"warnings":[]}

CRITICAL: The angle-bracket placeholders above (e.g. <CALCULATED_GBP>) mean you MUST calculate and insert the real numeric values from the bank statements. monthlyIncome and averageBalance must be actual GBP figures, NOT zero. Zero is only correct if the statements genuinely show no income and no balance across all months. If you can read any transactions at all, calculate the real figures.

${rulesText}

ADDITIONAL ANALYSIS RULES:

Self-transfers must be excluded from expenses:
Do NOT count transfers to self (savings, ISA, 'to myself', same-name transfers) as outgoings. Treat as savings behaviour, note in summary.

JOINT/SPOUSE/PARTNER INCOME (CRITICAL):
If statements belong to multiple people (different account holder names across files):
- Set isJointApplication: true
- Sum ALL income across ALL account holders — this is the combined household income
- The "monthlyIncome" field MUST be the TOTAL combined household income (not just one person's)
- List each person's individual income in "incomeBreakdown" array
- List each person in "jointApplicants" array with their individual income
- Use the COMBINED household income for rent-to-income ratio calculation
- Use the COMBINED household income for all affordability calculations
- Example: Person A earns £2,500/mo, Person B earns £2,500/mo → monthlyIncome must be £5,000, rentToIncomeRatio = rent / £5,000

${declaredIncomePounds ? `DECLARED vs ACTUAL INCOME CHECK (MANDATORY):
Applicant declared monthly income: £${declaredIncomePounds}
Compare declared income against the TOTAL combined household income from ALL statements (not just one person's income).
If this is a joint application, sum all account holders' income before comparing.
You MUST fire the matching rule based on COMBINED income vs declared:
- Combined actual >= 90% of declared: no penalty
- Combined actual 70-89% of declared: you MUST fire INCOME_SLIGHT_DISCREPANCY
- Combined actual 50-69% of declared: you MUST fire INCOME_SIGNIFICANT_DISCREPANCY
- Combined actual < 50% of declared: you MUST fire INCOME_MAJOR_DISCREPANCY
There are no exceptions to this. Calculate the percentage and fire the rule.

` : ''}SELF-EMPLOYED AND COMPANY DIRECTORS:
Include salary + dividends + director's loan repayments as income. Do not penalise income arriving in multiple streams if the applicant appears self-employed.

DIRECTOR'S LOAN REPAYMENTS:
Outgoing payments with reference containing 'Director's Loan', 'Directors Loan', or 'Director Loan' are repayments TO the applicant's own company — not debt obligations. These are discretionary transfers, not mandatory debt repayments. DO NOT count these toward DEBT_ABOVE_20_PCT_INCOME. DO NOT flag as debt burden. DO NOT include in debt calculations. These are a NEUTRAL or POSITIVE signal — they indicate the applicant is a company director managing their own business finances.

GAMBLING RULE: Only fire the single highest gambling rule (GAMBLING_ABOVE_10_PCT > GAMBLING_ABOVE_5_PCT > GAMBLING_ANY). But GAMBLING_4_PLUS_MONTHS fires independently.

AFFORDABILITY (STRICT — fire exactly one based on actual ratio):
Calculate rent-to-income ratio = rent / TOTAL monthly income (combined if joint application).
Monthly rent is £${rentPounds}. Calculate the exact ratio and fire ONLY the matching band:
- ratio < 0.25: fire RENT_BELOW_25_PCT
- ratio >= 0.25 AND ratio < 0.30: fire RENT_25_TO_30_PCT
- ratio >= 0.30 AND ratio < 0.35: fire RENT_30_TO_35_PCT
- ratio >= 0.35 AND ratio < 0.40: fire RENT_35_TO_40_PCT
- ratio >= 0.40: fire RENT_ABOVE_40_PCT
You MUST fire exactly one. Do NOT fire RENT_ABOVE_40_PCT unless the ratio is actually >= 0.40.

IMPORTANT: Your response must be valid JSON only. Do not include your scoring working, calculations, or chain of thought in the 'summary' field. The summary field must contain ONLY the human-readable assessment paragraph. Your working (Starting score, deductions, final) goes in the 'scoreBreakdown' field, NEVER in the summary field.`

  // Log pre-AI details
  const systemChars = systemPrompt.length
  const userChars = userPrompt.length
  const systemTokens = Math.ceil(systemChars / 4)
  const userTokens = Math.ceil(userChars / 4)
  console.log(`[screening:ai] ── SENDING TO CLAUDE API ──────────────`)
  console.log(`[screening:ai] Model: claude-sonnet-4-20250514`)
  console.log(`[screening:ai] Documents: ${pdfFiles.length} PDF(s): ${pdfFiles.map((f) => f.fileName).join(', ')}`)
  console.log(`[screening:ai] Monthly rent: £${rentPounds}`)
  if (declaredIncomePounds) {
    console.log(`[screening:ai] Declared income: £${declaredIncomePounds}`)
    const rentNum = parseFloat(rentPounds)
    const incomeNum = parseFloat(declaredIncomePounds)
    if (incomeNum > 0) console.log(`[screening:ai] Rent-to-declared-income ratio: ${(rentNum / incomeNum * 100).toFixed(1)}%`)
  }
  console.log(`[screening:ai] Prompt estimate — system: ${systemChars} chars (~${systemTokens} tokens), user: ${userChars} chars (~${userTokens} tokens), est total text tokens: ~${systemTokens + userTokens}`)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            ...documentBlocks,
            { type: 'text', text: userPrompt },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`[screening:ai] Analysis API error ${response.status}: ${text.substring(0, 300)}`)
    if (response.status === 429) throw new RateLimitError(`Rate limited by Claude API: ${text}`)
    throw new Error(`Claude API error ${response.status}: ${text}`)
  }

  const result = await response.json() as {
    content: Array<{ type: string; text?: string }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }

  if (result.usage) {
    console.log(`[screening:ai] API usage — input_tokens: ${result.usage.input_tokens}, output_tokens: ${result.usage.output_tokens}`)
  }

  const textBlock = result.content.find((b) => b.type === 'text')
  if (!textBlock?.text) throw new Error('No text response from Claude')

  // Log complete raw response
  console.log(`[screening:ai] ── RAW AI RESPONSE ──────────────────`)
  console.log(`[screening:ai] ${textBlock.text}`)
  console.log(`[screening:ai] ── END RAW RESPONSE ─────────────────`)

  // Extract JSON — Claude sometimes wraps it in markdown fences or adds prose before/after
  let jsonStr = textBlock.text.trim()

  // Try stripping markdown code fences first
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  // If the result doesn't start with '{', find the first '{' and last '}'
  if (!jsonStr.startsWith('{')) {
    console.log(`[screening:ai] Response didn't start with '{', extracting JSON from position ${jsonStr.indexOf('{')}`)
    const firstBrace = jsonStr.indexOf('{')
    const lastBrace = jsonStr.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
    }
  }

  const parsed = JSON.parse(jsonStr) as ClaudeAnalysisResponse

  // Coerce numeric fields — AI sometimes returns strings instead of numbers
  parsed.monthlyIncome = parseFloat(String(parsed.monthlyIncome ?? '0')) || 0
  parsed.averageBalance = parseFloat(String(parsed.averageBalance ?? '0')) || 0
  parsed.rentToIncomeRatio = parseFloat(String(parsed.rentToIncomeRatio ?? '0')) || 0
  parsed.analysedMonths = parseFloat(String(parsed.analysedMonths ?? '0')) || 0
  if (parsed.incomeBreakdown) {
    parsed.incomeBreakdown = parsed.incomeBreakdown.map((p) => ({
      ...p,
      monthlyIncome: parseFloat(String(p.monthlyIncome ?? '0')) || 0,
    }))
  }

  // Log parsed response details
  console.log(`[screening:ai] ── PARSED RESPONSE ──────────────────`)
  console.log(`[screening:ai] monthlyIncome: £${parsed.monthlyIncome}`)
  console.log(`[screening:ai] averageBalance: £${parsed.averageBalance}`)
  console.log(`[screening:ai] rentToIncomeRatio: ${parsed.rentToIncomeRatio}`)
  console.log(`[screening:ai] analysedMonths: ${parsed.analysedMonths}`)
  console.log(`[screening:ai] confidence: ${parsed.confidence}`)
  console.log(`[screening:ai] firedRules: [${parsed.firedRules.join(', ')}]`)
  console.log(`[screening:ai] isJointApplication: ${parsed.isJointApplication ?? false}`)
  if (parsed.warnings && parsed.warnings.length > 0) {
    console.log(`[screening:ai] warnings: ${JSON.stringify(parsed.warnings)}`)
  }
  console.log(`[screening:ai] summary (first 150 chars): ${parsed.summary?.substring(0, 150)}`)
  console.log(`[screening:ai] ── END PARSED ──────────────────────`)

  // Check for suspicious zero values
  if (parsed.monthlyIncome === 0) {
    console.warn(`[screening:ai] ⚠️  monthlyIncome is 0 — type: ${typeof parsed.monthlyIncome}`)
  }
  if (parsed.averageBalance === 0) {
    console.warn(`[screening:ai] ⚠️  averageBalance is 0 — type: ${typeof parsed.averageBalance}`)
  }

  return parsed
}

// ── Analyse a single PDF (may be split) with synthesis ───────────────────────

async function analyseSinglePdf(
  buffers: Buffer[],
  fileName: string,
  ownershipNote: string,
  monthlyRentPence: number,
  rulesText: string,
  apiKey: string,
  declaredIncomePence?: number | null,
  declaredJointApplication?: boolean,
): Promise<ClaudeAnalysisResponse> {
  if (buffers.length === 1) {
    return callClaudeAnalysis(
      [{ base64: buffers[0].toString('base64'), fileName, ownershipNote }],
      monthlyRentPence,
      rulesText,
      apiKey,
      declaredIncomePence,
      declaredJointApplication,
    )
  }

  // Two halves — analyse each then synthesize
  console.log(`[scoring/engine] Analysing ${fileName} in two halves, then synthesizing`)
  const [resultA, resultB] = await Promise.all([
    callClaudeAnalysis(
      [{ base64: buffers[0].toString('base64'), fileName: `${fileName} (part 1)`, ownershipNote }],
      monthlyRentPence,
      rulesText,
      apiKey,
      declaredIncomePence,
      declaredJointApplication,
    ),
    callClaudeAnalysis(
      [{ base64: buffers[1].toString('base64'), fileName: `${fileName} (part 2)`, ownershipNote }],
      monthlyRentPence,
      rulesText,
      apiKey,
      declaredIncomePence,
      declaredJointApplication,
    ),
  ])

  return synthesizeHalves(resultA, resultB, monthlyRentPence, rulesText, apiKey)
}

// ── Main engine function ───────────────────────────────────────────────────────

export async function analyzeStatement(reportId: string): Promise<void> {
  console.log(`[screening] ─────────────────────────────────────────`)
  console.log(`[screening] START: reportId=${reportId}`)
  console.log(`[screening] ─────────────────────────────────────────`)
  const pipelineStartTime = Date.now()

  // 1. Fetch report
  const report = await prisma.financialReport.findUnique({
    where: { id: reportId },
    include: { property: true, invite: { include: { landlord: true } } },
  })
  if (!report) throw new Error(`FinancialReport ${reportId} not found`)

  // Check if applicant declared this as a joint application (stored as marker in jointApplicants before analysis)
  const declaredJointApplication = report.jointApplicants !== null
    && typeof report.jointApplicants === 'object'
    && !Array.isArray(report.jointApplicants)
    && (report.jointApplicants as Record<string, unknown>).declaredByApplicant === true

  console.log(`[screening] Report loaded — inviteId=${report.inviteId ?? 'none'}, applicantName="${report.applicantName}", reportType=${report.reportType}`)
  console.log(`[screening] monthlyRentPence=${report.monthlyRentPence}, declaredIncomePence=${report.declaredIncomePence}`)
  console.log(`[screening] Declared joint application: ${declaredJointApplication}`)
  if (report.invite) {
    console.log(`[screening] Invite context — candidateEmail="${report.invite.candidateEmail}", candidateName="${report.invite.candidateName}", landlord="${report.invite.landlord.email}"`)
  }

  const statementFiles = report.statementFiles as StatementFile[] | null
  if (!statementFiles || statementFiles.length === 0) {
    throw new Error('No statement files on report')
  }

  // Filter out files removed by applicant
  const activeFiles = statementFiles.filter((f) => !f.removedByApplicant)
  if (activeFiles.length === 0) {
    throw new Error('All statement files have been removed')
  }

  console.log(`[screening:pdf] Files received: ${activeFiles.length} (${statementFiles.length} total, ${statementFiles.length - activeFiles.length} removed)`)
  for (const f of activeFiles) {
    console.log(`[screening:pdf] File ${f.index}: ${f.fileName} ${(f.fileSize / 1024).toFixed(0)}KB`)
  }

  // 2. Mark as processing
  await prisma.financialReport.update({
    where: { id: reportId },
    data: { status: 'PROCESSING' },
  })
  console.log(`[screening:db] Status → PROCESSING`)

  try {
    // 3. Fetch active config and rules
    // Invalidate cache so rule format changes take effect without server restart
    cachedRulesCompact = null
    cachedRuleMap = null
    const [config, { rulesText, ruleMap }] = await Promise.all([
      prisma.scoringConfig.findFirst({ where: { isActive: true } }),
      getRulesCompact(),
    ])
    if (!config) throw new Error('No active ScoringConfig found')

    const apiKey = env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')

    // 4. Download all PDFs and prepare (compress/split)
    console.log(`[screening:pdf] Downloading ${activeFiles.length} PDF(s) from storage...`)
    const pdfDataList: Array<{ buffers: Buffer[]; file: StatementFile }> = []
    for (const file of activeFiles) {
      const rawBuffer = await downloadPdfBuffer(file.storagePath)
      console.log(`[screening:pdf] Downloaded ${file.fileName}: ${(rawBuffer.length / 1024).toFixed(0)}KB raw`)
      const prepared = await preparePdf(rawBuffer)
      if (prepared.length > 1) {
        console.log(`[screening:pdf] ${file.fileName} was split into ${prepared.length} parts: ${prepared.map((b, i) => `part${i + 1}=${(b.length / 1024).toFixed(0)}KB`).join(', ')}`)
      }
      pdfDataList.push({ buffers: prepared, file })
    }
    console.log(`[screening:pdf] All PDFs prepared — total parts: ${pdfDataList.reduce((s, p) => s + p.buffers.length, 0)}`)

    // 5. Name verification + period extraction (if applicantName provided)
    const applicantName = report.applicantName
    const filePeriodsMap = new Map<number, { periodStart: string | null; periodEnd: string | null }>()

    if (applicantName) {
      console.log(`[screening:ai] Starting name verification for ${pdfDataList.length} file(s), applicant="${applicantName}"`)
      for (const pdfData of pdfDataList) {
        try {
          console.log(`[screening:ai] Verifying name for file ${pdfData.file.index}: ${pdfData.file.fileName}`)
          // Use the first buffer for name verification (even if split)
          const verifyResult = await verifyName(
            pdfData.buffers[0].toString('base64'),
            applicantName,
            apiKey,
          )

          // Update the file entry in statementFiles
          const fileIdx = statementFiles.findIndex((f) => f.index === pdfData.file.index)
          if (fileIdx >= 0) {
            statementFiles[fileIdx].verificationStatus = verifyResult.verification
            statementFiles[fileIdx].detectedName = verifyResult.foundName
            statementFiles[fileIdx].confidence = verifyResult.confidence
            statementFiles[fileIdx].reason = verifyResult.reason
          }

          // Store period data
          filePeriodsMap.set(pdfData.file.index, {
            periodStart: verifyResult.periodStart,
            periodEnd: verifyResult.periodEnd,
          })
        } catch (err) {
          // 429 = immediate fail
          if (err instanceof RateLimitError) {
            throw err
          }
          console.error(`[scoring/engine] Name verification failed for ${pdfData.file.fileName}:`, err)
          const fileIdx = statementFiles.findIndex((f) => f.index === pdfData.file.index)
          if (fileIdx >= 0) {
            statementFiles[fileIdx].verificationStatus = 'UNCERTAIN'
            statementFiles[fileIdx].reason = 'Name verification failed'
          }
          filePeriodsMap.set(pdfData.file.index, { periodStart: null, periodEnd: null })
        }
      }

      // Save intermediate name verification results
      const hasUnverified = statementFiles.some(
        (f) => !f.removedByApplicant && f.verificationStatus === 'UNVERIFIED',
      )
      await prisma.financialReport.update({
        where: { id: reportId },
        data: {
          statementFiles: statementFiles as unknown as Prisma.InputJsonValue,
          hasUnverifiedFiles: hasUnverified,
        },
      })
    }

    // 6. Build validation results per person
    const personMap = new Map<string, PersonValidation>()

    for (const file of statementFiles.filter((f) => !f.removedByApplicant)) {
      const name = file.verificationStatus === 'VERIFIED'
        ? (applicantName ?? 'Applicant')
        : (file.detectedName ?? 'Unknown')
      const isApplicant = file.verificationStatus === 'VERIFIED' ||
        file.verificationStatus === 'PENDING' ||
        file.verificationStatus === 'UNCERTAIN'

      const existing = personMap.get(name) ?? {
        name,
        isApplicant,
        fileIndices: [],
        periodStart: null,
        periodEnd: null,
        coverageDays: null,
        coverageStatus: 'UNKNOWN' as CoverageStatus,
      }

      existing.fileIndices.push(file.index)

      // Merge period: take the earliest start and latest end
      const filePeriod = filePeriodsMap.get(file.index)
      if (filePeriod) {
        if (filePeriod.periodStart) {
          if (!existing.periodStart || filePeriod.periodStart < existing.periodStart) {
            existing.periodStart = filePeriod.periodStart
          }
        }
        if (filePeriod.periodEnd) {
          if (!existing.periodEnd || filePeriod.periodEnd > existing.periodEnd) {
            existing.periodEnd = filePeriod.periodEnd
          }
        }
      }

      personMap.set(name, existing)
    }

    // Calculate coverage for each person
    const validationResults: PersonValidation[] = []
    for (const person of Array.from(personMap.values())) {
      const { coverageDays, coverageStatus } = validateCoverage(person.periodStart, person.periodEnd)
      person.coverageDays = coverageDays
      person.coverageStatus = coverageStatus
      validationResults.push(person)
      console.log(`[screening:pdf] Person "${person.name}" — isApplicant=${person.isApplicant}, files=[${person.fileIndices.join(',')}], period=${person.periodStart}→${person.periodEnd}, coverage=${coverageDays ?? '?'} days, status=${coverageStatus}`)
    }

    // Check if primary applicant fails validation
    const primaryPerson = validationResults.find((p) => p.isApplicant)
    if (primaryPerson && primaryPerson.coverageStatus !== 'PASS' && primaryPerson.coverageStatus !== 'UNKNOWN') {
      console.warn(`[screening:pdf] ⚠️  Primary applicant coverage check FAILED: ${primaryPerson.coverageStatus}`)
      const coverageMsg = primaryPerson.coverageStatus === 'WARN_SHORT'
        ? 'Your bank statements cover less than 2 months. Please upload statements covering at least the last 3 months.'
        : primaryPerson.coverageStatus === 'WARN_OLD'
          ? 'Your bank statements are more than 6 months old. Please upload recent statements from the last 3-6 months.'
          : 'Your bank statements are too short and too old. Please upload recent statements covering at least the last 3 months.'

      console.log(`[screening:db] Saving FAILED status — coverage validation failed: ${coverageMsg}`)
      await prisma.financialReport.update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
          failureReason: coverageMsg,
          validationResults: validationResults as unknown as Prisma.InputJsonValue,
          statementFiles: statementFiles as unknown as Prisma.InputJsonValue,
        },
      })
      const elapsed = ((Date.now() - pipelineStartTime) / 1000).toFixed(1)
      console.log(`[screening] ─────────────────────────────────────────`)
      console.log(`[screening] FAILED: coverage validation (${elapsed}s)`)
      console.log(`[screening] ─────────────────────────────────────────`)
      return
    }

    // Save validation results
    await prisma.financialReport.update({
      where: { id: reportId },
      data: {
        validationResults: validationResults as unknown as Prisma.InputJsonValue,
      },
    })

    // 7. Build ownership notes per file for the analysis
    const pdfFilesForAnalysis: Array<{ base64: string; fileName: string; ownershipNote: string }> = []

    for (const pdfData of pdfDataList) {
      const f = statementFiles.find((sf) => sf.index === pdfData.file.index)!
      let ownershipNote = 'Ownership not verified'
      if (f.verificationStatus === 'VERIFIED') {
        ownershipNote = `Verified as belonging to ${applicantName ?? 'applicant'}`
      } else if (f.verificationStatus === 'UNVERIFIED' && f.detectedName) {
        ownershipNote = `Name on statement: ${f.detectedName} (does not match applicant ${applicantName ?? 'unknown'})`
      } else if (f.verificationStatus === 'UNCERTAIN') {
        ownershipNote = 'Name could not be verified'
      }

      if (pdfData.buffers.length === 1) {
        pdfFilesForAnalysis.push({
          base64: pdfData.buffers[0].toString('base64'),
          fileName: f.fileName,
          ownershipNote,
        })
      } else {
        // Split file — add both halves
        for (let half = 0; half < pdfData.buffers.length; half++) {
          pdfFilesForAnalysis.push({
            base64: pdfData.buffers[half].toString('base64'),
            fileName: `${f.fileName} (part ${half + 1})`,
            ownershipNote,
          })
        }
      }
    }

    // 8. Get monthly rent (in pence): report field first, then tenancy lookup, then 0
    const monthlyRentPence = await (async () => {
      if (report.monthlyRentPence) {
        console.log(`[screening:score] Monthly rent from report: £${(report.monthlyRentPence / 100).toFixed(2)} (${report.monthlyRentPence}p)`)
        return report.monthlyRentPence
      }
      if (!report.propertyId) {
        console.warn(`[screening:score] ⚠️  No rent available — no monthlyRentPence and no propertyId`)
        return 0
      }
      const tenancy = await prisma.tenancy.findFirst({
        where: { propertyId: report.propertyId, status: { in: ['ACTIVE', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
      })
      const rent = tenancy?.monthlyRent ?? 0
      console.log(`[screening:score] Monthly rent from tenancy lookup: £${(rent / 100).toFixed(2)} (${rent}p)`)
      return rent
    })()

    // 9. Determine if we need split-synthesis or single-call analysis
    let analysis: ClaudeAnalysisResponse

    // Check if any single file was split
    const hasSplitFiles = pdfDataList.some((pd) => pd.buffers.length > 1)
    console.log(`[screening:ai] Analysis strategy: hasSplitFiles=${hasSplitFiles}, fileCount=${pdfDataList.length}, mode=${hasSplitFiles && pdfDataList.length === 1 ? 'split-synthesis' : 'single-call'}`)

    if (hasSplitFiles && pdfDataList.length === 1) {
      // Single file that was split — use synthesis approach
      const pd = pdfDataList[0]
      const f = statementFiles.find((sf) => sf.index === pd.file.index)!
      let ownershipNote = 'Ownership not verified'
      if (f.verificationStatus === 'VERIFIED') {
        ownershipNote = `Verified as belonging to ${applicantName ?? 'applicant'}`
      } else if (f.verificationStatus === 'UNVERIFIED' && f.detectedName) {
        ownershipNote = `Name on statement: ${f.detectedName}`
      }

      analysis = await analyseSinglePdf(
        pd.buffers,
        f.fileName,
        ownershipNote,
        monthlyRentPence,
        rulesText,
        apiKey,
        report.declaredIncomePence,
        declaredJointApplication,
      )
    } else {
      // Multiple files or no splits — send all in one call
      analysis = await callClaudeAnalysis(
        pdfFilesForAnalysis,
        monthlyRentPence,
        rulesText,
        apiKey,
        report.declaredIncomePence,
        declaredJointApplication,
      )
    }

    // 9a. Sanity check: if Claude returned 0 income/balance despite analysing months, retry once
    if (
      analysis.analysedMonths > 0 &&
      analysis.monthlyIncome === 0 &&
      analysis.averageBalance === 0
    ) {
      console.warn(`[scoring] SUSPICIOUS: Claude returned 0 income/balance despite analysedMonths=${analysis.analysedMonths}. Retrying once.`)
      try {
        let retryAnalysis: ClaudeAnalysisResponse
        if (hasSplitFiles && pdfDataList.length === 1) {
          const pd = pdfDataList[0]
          const f = statementFiles.find((sf) => sf.index === pd.file.index)!
          let ownershipNote = 'Ownership not verified'
          if (f.verificationStatus === 'VERIFIED') ownershipNote = `Verified as belonging to ${applicantName ?? 'applicant'}`
          else if (f.verificationStatus === 'UNVERIFIED' && f.detectedName) ownershipNote = `Name on statement: ${f.detectedName}`
          retryAnalysis = await analyseSinglePdf(pd.buffers, f.fileName, ownershipNote, monthlyRentPence, rulesText, apiKey, report.declaredIncomePence, declaredJointApplication)
        } else {
          retryAnalysis = await callClaudeAnalysis(pdfFilesForAnalysis, monthlyRentPence, rulesText, apiKey, report.declaredIncomePence, declaredJointApplication)
        }
        if (retryAnalysis.monthlyIncome > 0 || retryAnalysis.averageBalance > 0) {
          console.log(`[scoring] Retry succeeded: monthlyIncome=${retryAnalysis.monthlyIncome}, averageBalance=${retryAnalysis.averageBalance}`)
          analysis = retryAnalysis
        } else {
          console.warn(`[scoring] Retry also returned 0 income/balance. Proceeding with original values.`)
        }
      } catch (retryErr) {
        console.error(`[scoring] Retry failed:`, retryErr)
        // Proceed with original analysis
      }
    }

    // 10. Compute combined household income for joint applications
    const isJoint = analysis.isJointApplication === true
    let combinedIncome = analysis.monthlyIncome
    if (isJoint && analysis.incomeBreakdown && analysis.incomeBreakdown.length > 0) {
      combinedIncome = analysis.incomeBreakdown.reduce((sum, p) => sum + (p.monthlyIncome ?? 0), 0)
      // If incomeBreakdown sum is 0 but monthlyIncome isn't, fall back to monthlyIncome
      if (combinedIncome === 0 && analysis.monthlyIncome > 0) {
        combinedIncome = analysis.monthlyIncome
      }
      console.log(`[screening:score] Joint application: YES`)
      console.log(`[screening:score] Income breakdown: ${analysis.incomeBreakdown.map((p) => `${p.name}=£${p.monthlyIncome}`).join(', ')}`)
      console.log(`[screening:score] Combined household income: £${combinedIncome}`)
    } else if (isJoint) {
      console.log(`[screening:score] Joint application: YES (no incomeBreakdown, using monthlyIncome=£${analysis.monthlyIncome})`)
    } else {
      console.log(`[screening:score] Joint application: NO`)
      console.log(`[screening:score] Monthly income: £${analysis.monthlyIncome}`)
    }

    // Compute the server-side rent-to-income ratio using combined income
    const rentPounds = monthlyRentPence / 100
    const serverRentToIncome = combinedIncome > 0 ? rentPounds / combinedIncome : 0
    console.log(`[screening:score] Rent-to-income (server-side): £${rentPounds} / £${combinedIncome} = ${(serverRentToIncome * 100).toFixed(1)}%`)

    // 10a. Apply gambling deduplication
    const deduplicatedFiredKeys = deduplicateStackingRules(analysis.firedRules)
    const removedByDedup = analysis.firedRules.filter((k) => !deduplicatedFiredKeys.includes(k))
    if (removedByDedup.length > 0) {
      console.log(`[screening:score] Deduplication removed: [${removedByDedup.join(', ')}]`)
    }

    // 10b. Server-side validation of threshold-based rules
    // Skip rules that AI fired incorrectly based on actual computed values
    const rentBandRules: Record<string, (ratio: number) => boolean> = {
      'RENT_BELOW_25_PCT': (r) => r < 0.25,
      'RENT_25_TO_30_PCT': (r) => r >= 0.25 && r < 0.30,
      'RENT_30_TO_35_PCT': (r) => r >= 0.30 && r < 0.35,
      'RENT_35_TO_40_PCT': (r) => r >= 0.35 && r < 0.40,
      'RENT_ABOVE_40_PCT': (r) => r >= 0.40,
    }
    const incomeDiscrepancyRules = [
      'INCOME_SLIGHT_DISCREPANCY',
      'INCOME_SIGNIFICANT_DISCREPANCY',
      'INCOME_MAJOR_DISCREPANCY',
    ]

    const skippedRules: Array<{ key: string; reason: string }> = []
    const validatedFiredKeys = deduplicatedFiredKeys.filter((key) => {
      // Validate rent-band rules against server-computed ratio
      if (key in rentBandRules && combinedIncome > 0) {
        const isCorrectBand = rentBandRules[key](serverRentToIncome)
        if (!isCorrectBand) {
          const reason = `ratio is ${(serverRentToIncome * 100).toFixed(1)}%, does not match band`
          skippedRules.push({ key, reason })
          console.warn(`[screening:score] ⚠️  SKIPPING ${key} — ${reason} (AI fired incorrectly)`)
          return false
        }
      }

      // Validate income discrepancy rules for joint applications
      if (isJoint && incomeDiscrepancyRules.includes(key) && report.declaredIncomePence && combinedIncome > 0) {
        const declaredPounds = report.declaredIncomePence / 100
        const incomeRatio = combinedIncome / declaredPounds
        if (incomeRatio >= 0.90) {
          // Combined income explains declared amount — no discrepancy
          const reason = `joint combined income £${combinedIncome.toFixed(0)} is ${(incomeRatio * 100).toFixed(0)}% of declared £${declaredPounds.toFixed(0)}`
          skippedRules.push({ key, reason })
          console.warn(`[screening:score] ⚠️  SKIPPING ${key} — ${reason} (joint income explains declared)`)
          return false
        } else if (key === 'INCOME_MAJOR_DISCREPANCY' && incomeRatio >= 0.50) {
          // Not major — may still be significant or slight
          const reason = `joint combined income ratio is ${(incomeRatio * 100).toFixed(0)}%, not < 50%`
          skippedRules.push({ key, reason })
          console.warn(`[screening:score] ⚠️  SKIPPING ${key} — ${reason}`)
          return false
        } else if (key === 'INCOME_SIGNIFICANT_DISCREPANCY' && incomeRatio >= 0.70) {
          const reason = `joint combined income ratio is ${(incomeRatio * 100).toFixed(0)}%, not < 70%`
          skippedRules.push({ key, reason })
          console.warn(`[screening:score] ⚠️  SKIPPING ${key} — ${reason}`)
          return false
        }
      }

      return true
    })

    // If we removed rent-band rules, ensure the correct one is present
    const anyRentBandFired = Object.keys(rentBandRules).some((k) => validatedFiredKeys.includes(k))
    if (!anyRentBandFired && combinedIncome > 0) {
      // Find the correct band and add it
      const correctBand = Object.entries(rentBandRules).find(([, check]) => check(serverRentToIncome))
      if (correctBand) {
        console.log(`[screening:score] Adding correct rent band: ${correctBand[0]} (ratio=${(serverRentToIncome * 100).toFixed(1)}%)`)
        validatedFiredKeys.push(correctBand[0])
      }
    }

    console.log(`[screening:score] Rules validated server-side: ${validatedFiredKeys.length} passed, ${skippedRules.length} skipped (AI error)`)
    if (skippedRules.length > 0) {
      console.log(`[screening:score] Skipped rules: ${skippedRules.map((s) => `${s.key} (${s.reason})`).join(', ')}`)
    }

    // 11. Match fired rule keys to DB records
    const unknownKeys = validatedFiredKeys.filter((key) => !ruleMap.has(key))
    if (unknownKeys.length > 0) {
      console.warn(`[screening:score] ⚠️  Unknown rule keys from AI (not in DB): [${unknownKeys.join(', ')}]`)
    }

    const appliedRuleRecords = validatedFiredKeys
      .filter((key) => ruleMap.has(key))
      .map((key) => {
        const r = ruleMap.get(key)!
        return { key: r.key, description: r.description, points: r.points, category: r.category }
      })

    // 12. Calculate score starting at 100
    console.log(`[screening:score] ── SCORE CALCULATION ────────────────`)
    console.log(`[screening:score] Starting score: 100`)
    let runningScore = 100
    for (const r of appliedRuleRecords) {
      runningScore += r.points
      console.log(`[screening:score] Rule: ${r.key} (${r.category}) → ${r.points >= 0 ? '+' : ''}${r.points} = ${runningScore}`)
    }

    let totalScore = Math.min(100, Math.max(0, runningScore))
    if (totalScore !== runningScore) {
      console.log(`[screening:score] Clamped ${runningScore} → ${totalScore} (0-100 range)`)
    }
    console.log(`[screening:score] Score after rules: ${totalScore} (${appliedRuleRecords.length} rules applied)`)

    // Special warning for zero score
    if (totalScore === 0) {
      console.warn(`[screening:score] ⚠️  SCORE IS 0 — investigating...`)
      console.warn(`[screening:score] Applied rules: ${JSON.stringify(appliedRuleRecords.map((r) => ({ key: r.key, points: r.points })))}`)
      console.warn(`[screening:score] Raw firedRules from AI: [${analysis.firedRules.join(', ')}]`)
      console.warn(`[screening:score] After dedup: [${deduplicatedFiredKeys.join(', ')}]`)
      console.warn(`[screening:score] After validation: [${validatedFiredKeys.join(', ')}]`)
    }

    // 12a. Server-side sanity checks — safety net for when Claude misses penalties
    console.log(`[screening:score] ── SANITY CHECKS ───────────────────`)
    // Check income discrepancy — use combined income for joint applications
    if (report.declaredIncomePence && combinedIncome > 0) {
      const declaredPounds = report.declaredIncomePence / 100
      const ratio = combinedIncome / declaredPounds
      console.log(`[screening:score] Income check: combined £${combinedIncome.toFixed(0)} vs declared £${declaredPounds.toFixed(0)} = ${(ratio * 100).toFixed(0)}%`)

      if (ratio < 0.5 && totalScore > 60) {
        console.warn(`[screening:score] SANITY CHECK FAILED: income ratio ${(ratio * 100).toFixed(0)}% but score=${totalScore}. Capping at 60.`)
        totalScore = 60
      } else if (ratio < 0.7 && totalScore > 75) {
        console.warn(`[screening:score] SANITY CHECK: income ratio ${(ratio * 100).toFixed(0)}% but score=${totalScore}. Capping at 75.`)
        totalScore = 75
      }
    }

    // Check statement coverage
    if (primaryPerson && primaryPerson.coverageDays !== null && primaryPerson.coverageDays < 90 && totalScore > 85) {
      console.warn(`[screening:score] SANITY CHECK: statement coverage only ${primaryPerson.coverageDays} days but score=${totalScore}. Capping at 85.`)
      totalScore = 85
    }

    // Check rent-to-income — use server-computed ratio (already based on combined income)
    if (serverRentToIncome > 0.4 && totalScore > 70) {
      console.warn(`[screening:score] SANITY CHECK: rent-to-income ${(serverRentToIncome * 100).toFixed(0)}% but score=${totalScore}. Capping at 70.`)
      totalScore = 70
    }

    // 13. Build breakdown by category
    const breakdown: Record<string, number> = {}
    for (const r of appliedRuleRecords) {
      breakdown[r.category] = (breakdown[r.category] ?? 0) + r.points
    }

    // 14. Determine grade
    const grade = scoreToGrade(totalScore)
    console.log(`[screening:score] Final score: ${totalScore}, Grade: ${grade}`)
    console.log(`[screening:score] Breakdown by category: ${JSON.stringify(breakdown)}`)
    console.log(`[screening:score] ── END SCORE CALCULATION ────────────`)

    // 15. Build verification warning text
    const unverifiedFiles = statementFiles.filter(
      (f) => !f.removedByApplicant && f.verificationStatus === 'UNVERIFIED',
    )
    const verificationWarning = unverifiedFiles.length > 0
      ? `${unverifiedFiles.length} of ${activeFiles.length} statement${activeFiles.length > 1 ? 's' : ''} could not be verified as belonging to ${applicantName ?? 'the applicant'}. Names found: ${unverifiedFiles.map((f) => f.detectedName ?? 'unknown').join(', ')}.`
      : null

    // 16. Build jointApplicants from analysis
    const jointApplicants: JointApplicant[] | null = analysis.isJointApplication && analysis.jointApplicants
      ? analysis.jointApplicants.map((ja) => {
          const matchingFiles = statementFiles.filter(
            (f) => !f.removedByApplicant && f.detectedName?.toLowerCase().includes(ja.name.toLowerCase()),
          )
          const fileStatus = matchingFiles.length > 0 ? matchingFiles[0].verificationStatus : 'UNCERTAIN'
          const status: 'VERIFIED' | 'UNVERIFIED' | 'UNCERTAIN' =
            fileStatus === 'PENDING' ? 'UNCERTAIN' : fileStatus
          return {
            name: ja.name,
            verificationStatus: status,
            income: ja.income,
            fileIndices: matchingFiles.map((f) => f.index),
          }
        })
      : null

    // 17. Final hasUnverifiedFiles check
    const hasUnverifiedFiles = statementFiles.some(
      (f) => !f.removedByApplicant && f.verificationStatus === 'UNVERIFIED',
    )

    // 18. Save all results
    console.log(`[screening:db] Saving report...`)
    console.log(`[screening:db] reportId=${reportId}`)
    console.log(`[screening:db] totalScore=${totalScore}, grade=${grade}`)
    console.log(`[screening:db] isLocked=${report.isLocked}`)
    console.log(`[screening:db] hasUnverifiedFiles=${hasUnverifiedFiles}`)
    console.log(`[screening:db] appliedRules count=${appliedRuleRecords.length}`)
    if (verificationWarning) {
      console.log(`[screening:db] verificationWarning: ${verificationWarning}`)
    }

    await prisma.financialReport.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        totalScore,
        grade,
        aiSummary: cleanSummary(analysis.summary),
        breakdown,
        appliedRules: appliedRuleRecords,
        scoringConfigVersion: config.version,
        statementFiles: statementFiles as unknown as Prisma.InputJsonValue,
        hasUnverifiedFiles,
        verificationWarning,
        jointApplicants: jointApplicants
          ? (jointApplicants as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        validationResults: validationResults as unknown as Prisma.InputJsonValue,
      },
    })
    console.log(`[screening:db] Report saved successfully — status=COMPLETED`)

    // 19. If this report came from an invite, update invite status and notify landlord
    if (report.inviteId && report.invite) {
      try {
        console.log(`[screening:db] Updating invite ${report.inviteId} → COMPLETED`)
        await prisma.screeningInvite.update({
          where: { id: report.inviteId },
          data: { status: 'COMPLETED', updatedAt: new Date() },
        })

        const { landlordNotificationHtml } = await import('@/lib/email-templates')
        const { sendEmail } = await import('@/lib/resend')
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'
        const reportUrl = `${appUrl}/screening/report/${report.inviteId}`

        console.log(`[screening:db] Sending landlord notification to ${report.invite.landlord.email}`)
        await sendEmail({
          to: report.invite.landlord.email,
          subject: `${report.invite.candidateName} completed their financial check`,
          html: landlordNotificationHtml({
            candidateName: report.invite.candidateName,
            score: totalScore,
            grade,
            reportUrl,
          }),
        })
        console.log(`[screening:db] Landlord notification sent`)
      } catch (notifyErr) {
        console.error(`[screening] ❌ Failed to notify landlord for invite ${report.inviteId}:`, notifyErr)
        // Don't fail the report — notification is best-effort
      }
    }

    const elapsed = ((Date.now() - pipelineStartTime) / 1000).toFixed(1)
    console.log(`[screening] ─────────────────────────────────────────`)
    console.log(`[screening] COMPLETE: score=${totalScore} grade=${grade} (${elapsed}s)`)
    console.log(`[screening] reportId=${reportId} inviteId=${report.inviteId ?? 'none'}`)
    console.log(`[screening] ─────────────────────────────────────────`)
  } catch (err) {
    const elapsed = ((Date.now() - pipelineStartTime) / 1000).toFixed(1)
    console.error(`[screening] ❌ FATAL ERROR (after ${elapsed}s):`)
    console.error(`[screening] reportId=${reportId}`)
    if (err instanceof Error) {
      console.error(`[screening] Message: ${err.message}`)
      console.error(`[screening] Stack: ${err.stack}`)
    } else {
      console.error(`[screening] Error:`, err)
    }

    // Determine failure reason
    let failureReason = 'Something went wrong during analysis. Please try again.'
    if (err instanceof RateLimitError) {
      failureReason = 'Our analysis service is currently at capacity. Please wait a few minutes and try again.'
    }

    console.log(`[screening:db] Saving FAILED status — reason: ${failureReason}`)
    await prisma.financialReport.update({
      where: { id: reportId },
      data: {
        status: 'FAILED',
        failureReason,
        statementFiles: statementFiles as unknown as Prisma.InputJsonValue,
      },
    })
    // Don't re-throw — the error is recorded in the DB
  }
}
