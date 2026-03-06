import { Prisma } from '@prisma/client'
import { PDFDocument } from 'pdf-lib'
import { prisma } from '@/lib/prisma'
import { getSignedUrl } from '@/lib/storage'
import { env } from '@/lib/env'

const BUCKET = 'bank-statements'
const COMPRESS_THRESHOLD = 2 * 1024 * 1024 // 2 MB
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000

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

  cachedRulesCompact = rules
    .map((r) => `${r.key}: ${r.points >= 0 ? '+' : ''}${r.points}pts`)
    .join('\n')

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

function deduplicateGamblingRules(firedKeys: string[]): string[] {
  const hasAbove10 = firedKeys.includes('GAMBLING_ABOVE_10_PCT')
  const hasAbove5  = firedKeys.includes('GAMBLING_ABOVE_5_PCT')

  return firedKeys.filter((key) => {
    if (key === 'GAMBLING_ABOVE_5_PCT' && hasAbove10) return false
    if (key === 'GAMBLING_ANY' && (hasAbove10 || hasAbove5)) return false
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

  const cleaned = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as NameVerificationResult
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

  const systemPrompt = 'You are a financial analyst. Merge two partial bank statement analyses into one combined result. Respond ONLY with valid JSON.'

  const userPrompt = `Two halves of the same bank statement were analysed separately. Merge them into one combined analysis. Monthly rent: £${rentPounds}.

Half A:
${JSON.stringify(resultA)}

Half B:
${JSON.stringify(resultB)}

Return the same JSON format:
{"firedRules":["KEY"],"monthlyIncome":0,"averageBalance":0,"rentToIncomeRatio":0,"summary":"3-4 sentences.","currency":"GBP","analysedMonths":0,"confidence":"HIGH|MEDIUM|LOW","isJointApplication":false,"jointApplicants":[],"incomeBreakdown":[],"warnings":[]}

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
    if (response.status === 429) throw new RateLimitError(`Rate limited by Claude API: ${text}`)
    throw new Error(`Claude API error ${response.status}: ${text}`)
  }

  const result = await response.json() as { content: Array<{ type: string; text?: string }> }
  const textBlock = result.content.find((b) => b.type === 'text')
  if (!textBlock?.text) throw new Error('No text response from Claude for synthesis')

  const cleaned = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as ClaudeAnalysisResponse
}

// ── Main analysis call (supports multiple PDFs) ──────────────────────────────

async function callClaudeAnalysis(
  pdfFiles: Array<{ base64: string; fileName: string; ownershipNote: string }>,
  monthlyRentPence: number,
  rulesText: string,
  apiKey: string,
): Promise<ClaudeAnalysisResponse> {
  const rentPounds = (monthlyRentPence / 100).toFixed(2)

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

  const systemPrompt = 'You are a financial analyst reviewing bank statements for a UK rental property. Analyse all statements and respond ONLY with valid JSON.'

  const userPrompt = `Analyse these bank statements. Monthly rent: £${rentPounds}.

Files:
${ownershipSummary}

Return JSON:
{"firedRules":["KEY"],"monthlyIncome":0,"averageBalance":0,"rentToIncomeRatio":0,"summary":"3-4 sentences on financial health, strengths, risks, recommendation.","currency":"GBP","analysedMonths":0,"confidence":"HIGH|MEDIUM|LOW","isJointApplication":false,"jointApplicants":[{"name":"","income":0}],"incomeBreakdown":[{"name":"","monthlyIncome":0}],"warnings":[]}

Rules (fire key if pattern detected):
${rulesText}

IMPORTANT — Self-transfers must be excluded from expenses:
Do NOT count the following as expenses or outgoings:
- Transfers where the reference contains: '2myself', 'to myself', 'savings', 'isa', 'transfer to self', or any variation suggesting the account holder is moving money between their own accounts
- Transfers TO the account holder's own name (e.g. 'Bill Payment to [same name as account holder]')
- Transfers with references like 'barclays 2myself', 'lloyds savings', 'monzo pot', 'marcus savings' etc.
These represent the applicant moving money to their own savings/ISAs — treat as SAVINGS behaviour, not expenses. If you identify self-transfers, note this in your summary (e.g. 'Applicant regularly transfers £X/month to savings — positive financial behaviour, excluded from expenses'). When calculating average balance, if you detect regular self-transfers to savings, mention that true available funds may be higher than the current account balance suggests.

Notes: Only fire the single highest gambling rule. monthlyIncome/averageBalance/rentToIncomeRatio are combined across all statements in GBP. Set isJointApplication true + fill jointApplicants/incomeBreakdown if multiple people. Convert foreign currency to GBP.`

  // Log token estimates
  const systemChars = systemPrompt.length
  const userChars = userPrompt.length
  const systemTokens = Math.ceil(systemChars / 4)
  const userTokens = Math.ceil(userChars / 4)
  console.log(`[scoring/engine] Analysis prompt estimate — system: ${systemChars} chars (~${systemTokens} tokens), user: ${userChars} chars (~${userTokens} tokens), documents: ${pdfFiles.length}, est total text tokens: ~${systemTokens + userTokens}`)

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
    if (response.status === 429) throw new RateLimitError(`Rate limited by Claude API: ${text}`)
    throw new Error(`Claude API error ${response.status}: ${text}`)
  }

  const result = await response.json() as {
    content: Array<{ type: string; text?: string }>
  }

  const textBlock = result.content.find((b) => b.type === 'text')
  if (!textBlock?.text) throw new Error('No text response from Claude')

  const cleaned = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as ClaudeAnalysisResponse
}

// ── Analyse a single PDF (may be split) with synthesis ───────────────────────

async function analyseSinglePdf(
  buffers: Buffer[],
  fileName: string,
  ownershipNote: string,
  monthlyRentPence: number,
  rulesText: string,
  apiKey: string,
): Promise<ClaudeAnalysisResponse> {
  if (buffers.length === 1) {
    return callClaudeAnalysis(
      [{ base64: buffers[0].toString('base64'), fileName, ownershipNote }],
      monthlyRentPence,
      rulesText,
      apiKey,
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
    ),
    callClaudeAnalysis(
      [{ base64: buffers[1].toString('base64'), fileName: `${fileName} (part 2)`, ownershipNote }],
      monthlyRentPence,
      rulesText,
      apiKey,
    ),
  ])

  return synthesizeHalves(resultA, resultB, monthlyRentPence, rulesText, apiKey)
}

// ── Main engine function ───────────────────────────────────────────────────────

export async function analyzeStatement(reportId: string): Promise<void> {
  // 1. Fetch report
  const report = await prisma.financialReport.findUnique({
    where: { id: reportId },
    include: { property: true },
  })
  if (!report) throw new Error(`FinancialReport ${reportId} not found`)

  const statementFiles = report.statementFiles as StatementFile[] | null
  if (!statementFiles || statementFiles.length === 0) {
    throw new Error('No statement files on report')
  }

  // Filter out files removed by applicant
  const activeFiles = statementFiles.filter((f) => !f.removedByApplicant)
  if (activeFiles.length === 0) {
    throw new Error('All statement files have been removed')
  }

  // 2. Mark as processing
  await prisma.financialReport.update({
    where: { id: reportId },
    data: { status: 'PROCESSING' },
  })

  try {
    // 3. Fetch active config and rules (rules cached at module level)
    const [config, { rulesText, ruleMap }] = await Promise.all([
      prisma.scoringConfig.findFirst({ where: { isActive: true } }),
      getRulesCompact(),
    ])
    if (!config) throw new Error('No active ScoringConfig found')

    const apiKey = env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')

    // 4. Download all PDFs and prepare (compress/split)
    const pdfDataList: Array<{ buffers: Buffer[]; file: StatementFile }> = []
    for (const file of activeFiles) {
      const rawBuffer = await downloadPdfBuffer(file.storagePath)
      const prepared = await preparePdf(rawBuffer)
      pdfDataList.push({ buffers: prepared, file })
    }

    // 5. Name verification + period extraction (if applicantName provided)
    const applicantName = report.applicantName
    const filePeriodsMap = new Map<number, { periodStart: string | null; periodEnd: string | null }>()

    if (applicantName) {
      for (const pdfData of pdfDataList) {
        try {
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
    }

    // Check if primary applicant fails validation
    const primaryPerson = validationResults.find((p) => p.isApplicant)
    if (primaryPerson && primaryPerson.coverageStatus !== 'PASS' && primaryPerson.coverageStatus !== 'UNKNOWN') {
      const coverageMsg = primaryPerson.coverageStatus === 'WARN_SHORT'
        ? 'Your bank statements cover less than 2 months. Please upload statements covering at least the last 3 months.'
        : primaryPerson.coverageStatus === 'WARN_OLD'
          ? 'Your bank statements are more than 6 months old. Please upload recent statements from the last 3-6 months.'
          : 'Your bank statements are too short and too old. Please upload recent statements covering at least the last 3 months.'

      await prisma.financialReport.update({
        where: { id: reportId },
        data: {
          status: 'FAILED',
          failureReason: coverageMsg,
          validationResults: validationResults as unknown as Prisma.InputJsonValue,
          statementFiles: statementFiles as unknown as Prisma.InputJsonValue,
        },
      })
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

    // 8. Get monthly rent (in pence) from property tenancy or default to 0
    const monthlyRentPence = await (async () => {
      if (!report.propertyId) return 0
      const tenancy = await prisma.tenancy.findFirst({
        where: { propertyId: report.propertyId, status: { in: ['ACTIVE', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
      })
      return tenancy?.monthlyRent ?? 0
    })()

    // 9. Determine if we need split-synthesis or single-call analysis
    let analysis: ClaudeAnalysisResponse

    // Check if any single file was split
    const hasSplitFiles = pdfDataList.some((pd) => pd.buffers.length > 1)

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
      )
    } else {
      // Multiple files or no splits — send all in one call
      analysis = await callClaudeAnalysis(
        pdfFilesForAnalysis,
        monthlyRentPence,
        rulesText,
        apiKey,
      )
    }

    // 10. Apply gambling deduplication
    const deduplicatedFiredKeys = deduplicateGamblingRules(analysis.firedRules)

    // 11. Match fired rule keys to DB records
    const appliedRuleRecords = deduplicatedFiredKeys
      .filter((key) => ruleMap.has(key))
      .map((key) => {
        const r = ruleMap.get(key)!
        return { key: r.key, description: r.description, points: r.points, category: r.category }
      })

    // 12. Calculate score starting at 100
    const totalScore = Math.min(
      100,
      Math.max(
        0,
        appliedRuleRecords.reduce((sum, r) => sum + r.points, 100),
      ),
    )

    // 13. Build breakdown by category
    const breakdown: Record<string, number> = {}
    for (const r of appliedRuleRecords) {
      breakdown[r.category] = (breakdown[r.category] ?? 0) + r.points
    }

    // 14. Determine grade
    const grade = scoreToGrade(totalScore)

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
    await prisma.financialReport.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        totalScore,
        grade,
        aiSummary: analysis.summary,
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
  } catch (err) {
    console.error(`[scoring/engine] analyzeStatement failed for ${reportId}:`, err)

    // Determine failure reason
    let failureReason = 'Something went wrong during analysis. Please try again.'
    if (err instanceof RateLimitError) {
      failureReason = 'Our analysis service is currently at capacity. Please wait a few minutes and try again.'
    }

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
