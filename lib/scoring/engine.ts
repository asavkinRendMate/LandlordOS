import { prisma } from '@/lib/prisma'
import { getSignedUrl } from '@/lib/storage'
import { env } from '@/lib/env'

const BUCKET = 'bank-statements'

// ── Grade thresholds ───────────────────────────────────────────────────────────

function scoreToGrade(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 55) return 'Fair'
  if (score >= 40) return 'Poor'
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

// ── Claude prompt helpers ──────────────────────────────────────────────────────

interface ClaudeAnalysisResponse {
  firedRules: string[]
  monthlyIncome: number
  averageBalance: number
  rentToIncomeRatio: number
  summary: string
  currency: string
  analysedMonths: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

async function callClaudeAPI(
  pdfBase64: string,
  monthlyRentPence: number,
  ruleDescriptions: { key: string; description: string }[],
): Promise<ClaudeAnalysisResponse> {
  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')

  const rentPounds = (monthlyRentPence / 100).toFixed(2)

  const rulesText = ruleDescriptions
    .map((r) => `- ${r.key}: ${r.description}`)
    .join('\n')

  const userPrompt = `Analyse this bank statement and determine which of the following financial patterns are present. The monthly rent for this property is £${rentPounds}.

Respond with ONLY a JSON object in this exact format:
{
  "firedRules": ["RULE_KEY_1", "RULE_KEY_2"],
  "monthlyIncome": 0,
  "averageBalance": 0,
  "rentToIncomeRatio": 0,
  "summary": "3-4 sentence plain English summary of financial health. Be specific about strengths and risks. End with a practical recommendation for the landlord.",
  "currency": "GBP",
  "analysedMonths": 0,
  "confidence": "HIGH|MEDIUM|LOW"
}

Rules to check (apply the rule key if the pattern is detected):
${rulesText}

Important notes:
- For gambling rules, only include the single highest applicable rule
- monthlyIncome should be average monthly net income in GBP
- averageBalance should be average end-of-month balance in GBP
- rentToIncomeRatio should be rent as percentage of income (0-100)
- analysedMonths is how many months of data are in the statement
- If the statement is in a foreign language or currency, convert amounts to GBP equivalent and still perform the analysis
- confidence reflects how clearly readable and complete the data is`

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
      system:
        'You are a financial analyst reviewing a bank statement to assess tenant affordability and risk for a UK residential rental property. Analyse the provided bank statement carefully and respond ONLY with a valid JSON object. No preamble, no explanation outside the JSON.',
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
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Claude API error ${response.status}: ${text}`)
  }

  const result = await response.json() as {
    content: Array<{ type: string; text?: string }>
  }

  const textBlock = result.content.find((b) => b.type === 'text')
  if (!textBlock?.text) throw new Error('No text response from Claude')

  // Strip any markdown code fences if present
  const cleaned = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  return JSON.parse(cleaned) as ClaudeAnalysisResponse
}

// ── Main engine function ───────────────────────────────────────────────────────

export async function analyzeStatement(reportId: string): Promise<void> {
  // 1. Fetch report
  const report = await prisma.financialReport.findUnique({
    where: { id: reportId },
    include: { property: true },
  })
  if (!report) throw new Error(`FinancialReport ${reportId} not found`)
  if (!report.statementFileUrl) throw new Error('No statement file URL on report')

  // 2. Mark as processing
  await prisma.financialReport.update({
    where: { id: reportId },
    data: { status: 'PROCESSING' },
  })

  try {
    // 3. Fetch active config and rules
    const [config, rules] = await Promise.all([
      prisma.scoringConfig.findFirst({ where: { isActive: true } }),
      prisma.scoringRule.findMany({ where: { isActive: true } }),
    ])
    if (!config) throw new Error('No active ScoringConfig found')
    if (rules.length === 0) throw new Error('No active scoring rules found')

    // 4. Download PDF from Supabase Storage
    const signedUrl = await getSignedUrl(report.statementFileUrl, 300, BUCKET)
    const pdfResponse = await fetch(signedUrl)
    if (!pdfResponse.ok) throw new Error(`Failed to download PDF: ${pdfResponse.status}`)
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())
    const pdfBase64 = pdfBuffer.toString('base64')

    // 5. Get monthly rent (in pence) from property tenancy or default to 0
    const monthlyRentPence = await (async () => {
      if (!report.propertyId) return 0
      const tenancy = await prisma.tenancy.findFirst({
        where: { propertyId: report.propertyId, status: { in: ['ACTIVE', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
      })
      return tenancy?.monthlyRent ?? 0
    })()

    // 6. Call Claude API
    const ruleDescriptions = rules.map((r) => ({ key: r.key, description: r.description }))
    const analysis = await callClaudeAPI(pdfBase64, monthlyRentPence, ruleDescriptions)

    // 7. Apply gambling deduplication
    const deduplicatedFiredKeys = deduplicateGamblingRules(analysis.firedRules)

    // 8. Match fired rule keys to DB records
    const ruleMap = new Map(rules.map((r) => [r.key, r]))
    const appliedRuleRecords = deduplicatedFiredKeys
      .filter((key) => ruleMap.has(key))
      .map((key) => {
        const r = ruleMap.get(key)!
        return { key: r.key, description: r.description, points: r.points, category: r.category }
      })

    // 9. Calculate score starting at 100
    const totalScore = Math.min(
      100,
      Math.max(
        0,
        appliedRuleRecords.reduce((sum, r) => sum + r.points, 100),
      ),
    )

    // 10. Build breakdown by category
    const breakdown: Record<string, number> = {}
    for (const r of appliedRuleRecords) {
      breakdown[r.category] = (breakdown[r.category] ?? 0) + r.points
    }

    // 11. Determine grade
    const grade = scoreToGrade(totalScore)

    // 12. Save results
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
      },
    })
  } catch (err) {
    console.error(`[scoring/engine] analyzeStatement failed for ${reportId}:`, err)
    await prisma.financialReport.update({
      where: { id: reportId },
      data: { status: 'FAILED' },
    })
    throw err
  }
}
