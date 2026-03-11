/**
 * templates/screening-report.ts — AI financial screening result for landlord.
 *
 * Structure:
 * 1. Cover page — title, address, date, grade badge
 * 2. Summary — score bar, grade, applicant names, rent vs income
 * 3. Per-applicant section
 * 4. Per-category breakdown
 * 5. Verification page
 */

import type { ScreeningReportData } from '../types'
import {
  type RenderContext,
  createRenderContext,
  addPage,
  finalize,
  formatDate,
  formatPence,
  MARGIN_LEFT,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_WIDTH,
  COLORS,
  SPACING,
  TEXT_STYLES,
  GRADE_COLORS,
  SEVERITY_COLORS,
  drawText,
  drawRect,
  drawLine,
  ensureSpace,
} from '../renderer'
import { drawHeader } from '../components/header'
import { drawFooter } from '../components/footer'

export async function renderScreeningReport(data: ScreeningReportData): Promise<{ buffer: Buffer; pageCount: number }> {
  const ctx = await createRenderContext('Screening Report', {
    drawHeader: true,
    skipHeaderOnFirstPage: true,
  })
  const styles = TEXT_STYLES(ctx.fonts)
  const gradeColor = GRADE_COLORS[data.grade] ?? COLORS.textMuted

  // ── Page 1: Cover ────────────────────────────────────────────────────────

  // Green block top 220pt
  drawRect(ctx.currentPage, 0, PAGE_HEIGHT - 220, PAGE_WIDTH, 220, {
    color: COLORS.brandGreen,
  })

  ctx.currentPage.drawText('Financial Screening Report', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 100,
    size: 24,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })

  ctx.currentPage.drawText(data.propertyAddress, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 130,
    size: 12,
    font: ctx.fonts.regular,
    color: COLORS.white,
  })

  // Grade badge on cover
  const gradeText = `Grade ${data.grade}`
  const gradeW = ctx.fonts.bold.widthOfTextAtSize(gradeText, 16) + 24
  drawRect(ctx.currentPage, MARGIN_LEFT, PAGE_HEIGHT - 185, gradeW, 32, {
    color: gradeColor,
  })
  ctx.currentPage.drawText(gradeText, {
    x: MARGIN_LEFT + 12,
    y: PAGE_HEIGHT - 177,
    size: 16,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })

  // Generated date
  ctx.currentPage.drawText(`Generated: ${formatDate(data.generatedAt)}`, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 250,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })

  ctx.currentPage.drawText(`Unlocked by: ${data.unlockedBy}`, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 268,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })

  // ── Page 2: Summary ──────────────────────────────────────────────────────

  addPage(ctx)

  drawText(ctx, 'Summary', styles.title, {})
  ctx.cursorY -= SPACING.sectionGap

  // Score bar
  drawText(ctx, `Overall Score: ${data.totalScore}/100`, styles.sectionHeading, {})
  ctx.cursorY -= 8

  const barY = ctx.cursorY
  const barWidth = 300
  const barHeight = 20
  // Background
  drawRect(ctx.currentPage, MARGIN_LEFT, barY - barHeight, barWidth, barHeight, {
    color: COLORS.borderDefault,
  })
  // Fill
  const fillWidth = (data.totalScore / 100) * barWidth
  drawRect(ctx.currentPage, MARGIN_LEFT, barY - barHeight, fillWidth, barHeight, {
    color: gradeColor,
  })
  // Score label on bar
  ctx.currentPage.drawText(`${data.totalScore}`, {
    x: MARGIN_LEFT + fillWidth + 8,
    y: barY - 15,
    size: 10,
    font: ctx.fonts.bold,
    color: COLORS.textPrimary,
  })

  ctx.cursorY = barY - barHeight - SPACING.sectionGap

  // Grade label
  const gradeLabelMap: Record<string, string> = {
    A: 'Excellent', B: 'Good', C: 'Fair', D: 'Poor', F: 'High Risk',
  }
  drawText(ctx, `Grade: ${data.grade} — ${gradeLabelMap[data.grade] ?? ''}`, styles.subheading, {})
  ctx.cursorY -= SPACING.blockGap

  // Application type
  drawText(ctx, data.isJointApplication ? 'Joint Application' : 'Single Application', styles.body, {})
  ctx.cursorY -= SPACING.blockGap

  // Applicant names
  drawText(ctx, 'Applicant(s):', styles.subheading, {})
  for (const app of data.applicants) {
    drawText(ctx, `  ${app.fullName} (${app.email})`, styles.body, {})
  }
  ctx.cursorY -= SPACING.blockGap

  // Rent
  drawText(ctx, `Monthly Rent: ${formatPence(data.monthlyRentPence)}`, styles.body, {})
  ctx.cursorY -= SPACING.blockGap

  // Overall summary
  drawText(ctx, 'Summary', styles.subheading, {})
  drawText(ctx, data.overallSummary, styles.body, {})
  ctx.cursorY -= SPACING.sectionGap

  // ── Per-applicant sections ────────────────────────────────────────────────

  for (const applicant of data.applicants) {
    ensureSpace(ctx, 150)

    drawText(ctx, applicant.fullName, styles.sectionHeading, {})
    ctx.cursorY -= SPACING.blockGap

    drawText(ctx, `Email: ${applicant.email}`, styles.body, {})
    drawText(ctx, `Statement Period: ${formatDate(applicant.statementPeriodStart)} – ${formatDate(applicant.statementPeriodEnd)}`, styles.body, {})
    drawText(ctx, `Name Verified: ${applicant.nameVerified ? 'Yes' : 'No'}`, styles.body, {})
    drawText(ctx, `Avg Monthly Income: ${formatPence(applicant.averageMonthlyIncomePence)}`, styles.body, {})
    drawText(ctx, `Avg Monthly Outgoings: ${formatPence(applicant.averageMonthlyOutgoingsPence)}`, styles.body, {})

    ctx.cursorY -= SPACING.sectionGap
  }

  // ── Per-category breakdown ────────────────────────────────────────────────

  for (const category of data.categories) {
    addPage(ctx)

    drawText(ctx, category.name, styles.sectionHeading, {})
    ctx.cursorY -= 8

    // Category score bar
    const catBarY = ctx.cursorY
    const catBarWidth = 200
    drawRect(ctx.currentPage, MARGIN_LEFT, catBarY - 16, catBarWidth, 16, {
      color: COLORS.borderDefault,
    })
    const catFill = category.maxScore > 0 ? (category.score / category.maxScore) * catBarWidth : 0
    drawRect(ctx.currentPage, MARGIN_LEFT, catBarY - 16, Math.max(catFill, 0), 16, {
      color: gradeColor,
    })
    ctx.currentPage.drawText(`${category.score}/${category.maxScore}`, {
      x: MARGIN_LEFT + catBarWidth + 8,
      y: catBarY - 13,
      size: 9,
      font: ctx.fonts.bold,
      color: COLORS.textPrimary,
    })

    ctx.cursorY = catBarY - 16 - SPACING.blockGap

    // Summary
    drawText(ctx, category.summary, styles.body, {})
    ctx.cursorY -= SPACING.blockGap

    // Flags
    if (category.flags.length > 0) {
      drawText(ctx, 'Flags', styles.subheading, {})
      ctx.cursorY -= SPACING.labelValueGap

      for (const flag of category.flags) {
        ensureSpace(ctx, 30)

        const sevColor = SEVERITY_COLORS[flag.severity] ?? COLORS.textMuted
        const flagY = ctx.cursorY

        // Severity dot
        ctx.currentPage.drawCircle({
          x: MARGIN_LEFT + 5,
          y: flagY - 4,
          size: 3,
          color: sevColor,
        })

        // Rule name bold
        const ruleWidth = ctx.fonts.bold.widthOfTextAtSize(flag.rule, 9)
        ctx.currentPage.drawText(flag.rule, {
          x: MARGIN_LEFT + 16,
          y: flagY - 2,
          size: 9,
          font: ctx.fonts.bold,
          color: COLORS.textPrimary,
        })

        // Detail
        drawText(ctx, flag.detail, styles.body, {
          x: MARGIN_LEFT + 16,
          maxWidth: CONTENT_WIDTH - 16,
        })

        ctx.cursorY -= SPACING.labelValueGap
      }
    }
  }

  // ── Verification page ────────────────────────────────────────────────────

  addPage(ctx)

  drawText(ctx, 'Verification', styles.title, {})
  ctx.cursorY -= SPACING.sectionGap

  // Grey bordered box
  const boxY = ctx.cursorY
  const boxHeight = 100
  drawRect(ctx.currentPage, MARGIN_LEFT, boxY - boxHeight, CONTENT_WIDTH, boxHeight, {
    borderColor: COLORS.borderStrong,
    borderWidth: 1,
    color: COLORS.brandGreenLight,
  })

  ctx.currentPage.drawText('Verify this report at:', {
    x: MARGIN_LEFT + 16,
    y: boxY - 30,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })

  ctx.currentPage.drawText(data.verificationUrl, {
    x: MARGIN_LEFT + 16,
    y: boxY - 50,
    size: 9,
    font: ctx.fonts.regular,
    color: COLORS.brandGreen,
  })

  ctx.currentPage.drawText(
    'This report is cryptographically linked to the original bank statement analysis.',
    {
      x: MARGIN_LEFT + 16,
      y: boxY - 75,
      size: 8,
      font: ctx.fonts.regular,
      color: COLORS.textMuted,
    },
  )

  ctx.cursorY = boxY - boxHeight - SPACING.sectionGap

  // Disclaimer
  drawText(ctx,
    'This report is provided for informational purposes only and does not constitute a credit check or guarantee of tenant suitability. ' +
    'The landlord should conduct their own due diligence before making any tenancy decisions.',
    styles.legal,
    {},
  )

  // ── Headers and footers ─────────────────────────────────────────────────

  const totalPages = ctx.pages.length
  for (let i = 0; i < totalPages; i++) {
    if (i > 0) drawHeader(ctx.pages[i], ctx.fonts, 'Screening Report', ctx.logoImage)
    drawFooter(ctx.pages[i], ctx.fonts, i + 1, totalPages)
  }

  return finalize(ctx)
}
