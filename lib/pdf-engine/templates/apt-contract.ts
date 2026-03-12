/**
 * templates/apt-contract.ts — Assured Periodic Tenancy agreement.
 *
 * Based on the Gov.uk Model Tenancy Agreement adapted for
 * Assured Periodic Tenancies under the Renters' Rights Act 2025.
 *
 * Structure:
 * Cover page
 * Section A: Parties and Property
 * Section B: Rent
 * Section C: Deposit
 * Section D: Tenant Obligations
 * Section E: Access and Inspections
 * Section F: Landlord Obligations
 * Section G: Ending the Tenancy
 * Section H: Additional Terms (custom clauses + special conditions)
 * Section I: Signatures
 */

import type { AptContractData } from '../types'
import {
  type RenderContext,
  createRenderContext,
  addPage,
  finalize,
  formatAddress,
  formatDate,
  formatDateTime,
  formatPence,
  MARGIN_LEFT,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTENT_WIDTH,
  COLORS,
  SPACING,
  TEXT_STYLES,
  drawText,
  drawRect,
  ensureSpace,
} from '../renderer'
import { drawHeader } from '../components/header'
import { drawFooter } from '../components/footer'
import { drawPartyBlock } from '../components/party-block'
import { drawClauseBlock } from '../components/clause-block'
import { drawKeyValueTable } from '../components/table'

// ── Helpers ───────────────────────────────────────────────────────────────────

function drawSectionHeader(ctx: RenderContext, label: string) {
  addPage(ctx)
  const stripH = 28
  const stripBottom = ctx.cursorY - stripH
  drawRect(ctx.currentPage, MARGIN_LEFT, stripBottom, CONTENT_WIDTH, stripH, {
    color: COLORS.brandGreen,
  })
  ctx.currentPage.drawText(label, {
    x: MARGIN_LEFT + 10,
    y: stripBottom + 9,
    size: 11,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })
  ctx.cursorY = stripBottom - SPACING.sectionGap
}

function drawParagraph(
  ctx: RenderContext,
  text: string,
  style: ReturnType<typeof TEXT_STYLES>,
) {
  drawText(ctx, text, style.body, {})
  ctx.cursorY -= SPACING.blockGap
}

function drawNoticeBox(
  ctx: RenderContext,
  text: string,
  height: number,
) {
  const styles = TEXT_STYLES(ctx.fonts)
  ensureSpace(ctx, height + SPACING.blockGap)
  drawRect(ctx.currentPage, MARGIN_LEFT, ctx.cursorY - height, CONTENT_WIDTH, height, {
    color: COLORS.brandGreenLight,
    borderColor: COLORS.brandGreen,
    borderWidth: 1,
  })
  const savedY = ctx.cursorY
  ctx.cursorY -= 14
  drawText(ctx, text, {
    ...styles.caption,
    color: COLORS.brandGreen,
  }, {
    x: MARGIN_LEFT + 8,
    maxWidth: CONTENT_WIDTH - 16,
    paginate: false,
  })
  ctx.cursorY = savedY - height - SPACING.sectionGap
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/** Mask the last octet of an IP address for privacy. */
function maskIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`
  }
  // IPv6 or unexpected format — mask last segment
  const segments = ip.split(':')
  if (segments.length > 1) {
    segments[segments.length - 1] = 'xxxx'
    return segments.join(':')
  }
  return ip
}

// ── Main render ───────────────────────────────────────────────────────────────

export async function renderAptContract(data: AptContractData): Promise<{ buffer: Buffer; pageCount: number }> {
  const ctx = await createRenderContext('Tenancy Agreement', {
    drawHeader: true,
    skipHeaderOnFirstPage: true,
  })
  const styles = TEXT_STYLES(ctx.fonts)
  const address = formatAddress(data.property)

  // ── Cover Page ──────────────────────────────────────────────────────────

  drawRect(ctx.currentPage, 0, PAGE_HEIGHT - 220, PAGE_WIDTH, 220, {
    color: COLORS.brandGreen,
  })

  ctx.currentPage.drawText('Assured Periodic Tenancy', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 90,
    size: 24,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })

  ctx.currentPage.drawText('Agreement', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 118,
    size: 24,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })

  ctx.currentPage.drawText(address, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 150,
    size: 12,
    font: ctx.fonts.regular,
    color: COLORS.white,
  })

  ctx.currentPage.drawText(`Tenancy start: ${formatDate(data.tenancyStartDate)}`, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 175,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.white,
  })

  ctx.currentPage.drawText(`Ref: ${data.contractId}`, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 195,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.white,
  })

  ctx.currentPage.drawText(`Created: ${formatDate(data.createdAt)}`, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 250,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })

  // ── Section A: Parties and Property ─────────────────────────────────────

  drawSectionHeader(ctx, 'Section A \u2014 Parties and Property')

  drawNoticeBox(ctx,
    'This agreement creates an Assured Periodic Tenancy under the Housing Act 1988 ' +
    "as amended by the Renters' Rights Act 2025. Fixed-term tenancies are no longer " +
    'permitted for residential lets in England.',
    50,
  )

  drawText(ctx, 'The Landlord', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.labelValueGap
  drawPartyBlock(ctx, data.landlord.party, {})
  ctx.cursorY -= SPACING.sectionGap

  drawText(ctx, data.tenants.length > 1 ? 'The Tenants' : 'The Tenant', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.labelValueGap
  for (let i = 0; i < data.tenants.length; i++) {
    drawPartyBlock(ctx, data.tenants[i].party, {
      label: data.tenants.length > 1 ? `Tenant ${i + 1}` : undefined,
    })
    if (i < data.tenants.length - 1) ctx.cursorY -= SPACING.blockGap
  }
  ctx.cursorY -= SPACING.sectionGap

  if (data.permittedOccupiers && data.permittedOccupiers.length > 0) {
    drawText(ctx, 'Permitted Occupiers', styles.sectionHeading, {})
    ctx.cursorY -= SPACING.labelValueGap
    for (const occ of data.permittedOccupiers) {
      drawText(ctx, `\u2022 ${occ}`, styles.body, {})
    }
    ctx.cursorY -= SPACING.sectionGap
  }

  drawText(ctx, 'The Property', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.labelValueGap
  drawText(ctx, address, styles.body, {})
  if (data.maxOccupants) {
    ctx.cursorY -= SPACING.labelValueGap
    drawText(ctx, `Maximum occupants: ${data.maxOccupants}`, styles.body, {})
  }

  // ── Section B: Rent ─────────────────────────────────────────────────────

  drawSectionHeader(ctx, 'Section B \u2014 Rent')

  const rentItems = [
    { label: 'Monthly Rent', value: formatPence(data.monthlyRentPence) },
    { label: 'Rent Due', value: `${data.rentDueDay}${ordinal(data.rentDueDay)} of each month` },
    { label: 'Payment Method', value: data.paymentMethod ?? 'Standing order' },
  ]

  if (data.utilitiesIncluded) {
    const included: string[] = []
    if (data.utilitiesIncluded.councilTax) included.push('Council Tax')
    if (data.utilitiesIncluded.water) included.push('Water')
    if (data.utilitiesIncluded.gas) included.push('Gas')
    if (data.utilitiesIncluded.electricity) included.push('Electricity')
    if (included.length > 0) {
      rentItems.push({ label: 'Utilities Included', value: included.join(', ') })
    }
  }

  drawKeyValueTable(ctx, rentItems, { bordered: true, bgColor: COLORS.brandGreenLight })
  ctx.cursorY -= SPACING.sectionGap

  drawParagraph(ctx,
    `The tenant shall pay the rent of ${formatPence(data.monthlyRentPence)} per calendar month ` +
    `in advance on or before the ${data.rentDueDay}${ordinal(data.rentDueDay)} day of each month ` +
    "by standing order or bank transfer to the landlord's nominated bank account.",
    styles)

  drawParagraph(ctx,
    'The landlord may increase the rent by serving a notice under section 13 of the ' +
    "Housing Act 1988 as amended by the Renters' Rights Act 2025. A minimum of two " +
    "months' notice is required, and the rent may not be increased more than once in " +
    'any 12-month period. If the tenant considers the increase to be above the market ' +
    'rate, they may refer it to the First-tier Tribunal (Property Chamber) before the ' +
    'effective date.',
    styles)

  drawParagraph(ctx,
    'If the tenant fails to pay rent when due, the landlord may charge interest at a rate ' +
    "not exceeding 3% above the Bank of England's base rate on any rent outstanding more " +
    'than 14 days after the due date, in accordance with the Tenant Fees Act 2019.',
    styles)

  // ── Section C: Deposit ──────────────────────────────────────────────────

  drawSectionHeader(ctx, 'Section C \u2014 Deposit')

  drawKeyValueTable(ctx, [
    { label: 'Deposit Amount', value: formatPence(data.depositPence) },
    { label: 'Deposit Scheme', value: data.depositScheme ?? 'To be confirmed within 30 days' },
    { label: 'Deposit Reference', value: data.depositReference ?? 'Pending' },
  ], { bordered: true, bgColor: COLORS.brandGreenLight })
  ctx.cursorY -= SPACING.sectionGap

  drawParagraph(ctx,
    'The landlord must protect the deposit in a government-authorised tenancy deposit ' +
    'scheme within 30 days of receiving it from the tenant. The landlord must also ' +
    'provide the tenant with the prescribed information about the deposit protection ' +
    'scheme within the same period.',
    styles)

  drawParagraph(ctx,
    'At the end of the tenancy, the deposit (or the balance after any agreed deductions) ' +
    'shall be returned to the tenant within 10 days of both parties agreeing the amount ' +
    'to be returned, or within 10 days of a decision by the relevant dispute resolution ' +
    'service or court.',
    styles)

  drawParagraph(ctx,
    'The landlord may only make deductions from the deposit for: unpaid rent; damage to ' +
    'the property beyond fair wear and tear; missing items from the inventory; or cleaning ' +
    'costs where the property has not been left in a reasonably clean condition.',
    styles)

  // ── Section D: Tenant Obligations ───────────────────────────────────────

  drawSectionHeader(ctx, 'Section D \u2014 Tenant Obligations')

  drawParagraph(ctx,
    'The property shall be used as a private dwelling only by the tenant and any permitted ' +
    'occupiers named in this agreement. The tenant shall not use the property or allow it ' +
    'to be used for any business or commercial purpose without the prior written consent ' +
    'of the landlord.',
    styles)

  drawParagraph(ctx,
    'The tenant shall keep the interior of the property in a clean and reasonable condition ' +
    'and shall not cause or permit any damage to the property beyond fair wear and tear. ' +
    'The tenant shall report any disrepair or defect to the landlord as soon as reasonably ' +
    'practicable.',
    styles)

  drawParagraph(ctx,
    'The tenant shall not make any alterations or additions to the property without the ' +
    'prior written consent of the landlord. Such consent shall not be unreasonably withheld.',
    styles)

  drawParagraph(ctx,
    'The tenant shall not assign, sublet, or part with possession of the property or any ' +
    'part thereof without the prior written consent of the landlord.',
    styles)

  drawParagraph(ctx,
    'The tenant, and anyone living with or visiting the tenant, shall not engage in or ' +
    'threaten anti-social behaviour, or use the property for illegal purposes.',
    styles)

  // Pets (RRA 2025)
  if (data.petClause) {
    ensureSpace(ctx, 60)
    drawText(ctx, 'Pets', styles.subheading, {})
    ctx.cursorY -= SPACING.labelValueGap
    drawText(ctx, data.petClause, styles.body, {})
    ctx.cursorY -= SPACING.blockGap
  }

  drawParagraph(ctx,
    "Under the Renters' Rights Act 2025, a landlord must not unreasonably refuse a " +
    "tenant's request to keep a pet at the property. The landlord must respond to any " +
    'such request within 42 days. If no response is given within that period, consent ' +
    'is deemed to have been granted. The landlord may require the tenant to obtain pet ' +
    'damage insurance.',
    styles)

  // ── Section E: Access and Inspections ───────────────────────────────────

  drawSectionHeader(ctx, 'Section E \u2014 Access and Inspections')

  drawParagraph(ctx,
    'The landlord or their agent may enter the property at reasonable times of the day ' +
    'to inspect its condition or carry out repairs, having given at least 24 hours\' ' +
    'written notice, except in an emergency.',
    styles)

  drawParagraph(ctx,
    'The Landlord may carry out periodic property inspections during the Tenancy, subject ' +
    "to providing no less than 24 hours' written notice. Following each inspection, a " +
    'formal condition report will be prepared. The Tenant will be notified via the ' +
    'LetSorted platform to review and confirm the report. The Tenant has the right to ' +
    'raise disputes regarding any items recorded.',
    styles)

  drawParagraph(ctx,
    'The tenant shall allow access for gas safety inspections, electrical safety checks, ' +
    'and any other inspections required by law.',
    styles)

  drawParagraph(ctx,
    'In a genuine emergency (e.g. gas leak, flood, fire) the landlord or their agent may ' +
    'enter the property without notice to prevent danger to life or serious damage to the ' +
    'property.',
    styles)

  // ── Section F: Landlord Obligations ─────────────────────────────────────

  drawSectionHeader(ctx, 'Section F \u2014 Landlord Obligations')

  drawParagraph(ctx,
    'The landlord shall keep in repair the structure and exterior of the property, and ' +
    'keep in repair and proper working order the installations for the supply of water, ' +
    'gas, electricity, sanitation, space heating, and heating water, in accordance with ' +
    'section 11 of the Landlord and Tenant Act 1985.',
    styles)

  drawParagraph(ctx,
    'The landlord shall ensure the property meets the requirements of the Homes (Fitness ' +
    'for Human Habitation) Act 2018 throughout the tenancy.',
    styles)

  drawParagraph(ctx,
    'The landlord shall provide the tenant with a copy of the current Gas Safety ' +
    'Certificate, Energy Performance Certificate, Electrical Installation Condition ' +
    "Report, and the Government's 'How to Rent' guide before the tenancy commences.",
    styles)

  drawParagraph(ctx,
    'The landlord shall insure the building against fire and other usual risks. The ' +
    'tenant is responsible for insuring their own contents.',
    styles)

  if (data.isMortgaged) {
    drawParagraph(ctx,
      'The landlord confirms that the property is subject to a mortgage. The landlord ' +
      'has obtained the necessary consent from the mortgagee to let the property.',
      styles)
  }

  // ── Section G: Ending the Tenancy ───────────────────────────────────────

  drawSectionHeader(ctx, 'Section G \u2014 Ending the Tenancy')

  drawParagraph(ctx,
    'This is an Assured Periodic Tenancy. There is no fixed term and no end date. The ' +
    'tenancy continues on a rolling monthly basis until ended by either party in ' +
    'accordance with this section.',
    styles)

  drawParagraph(ctx,
    'The tenant may end this tenancy by giving the landlord at least two months\' notice ' +
    'in writing. The notice must expire on the last day of a period of the tenancy.',
    styles)

  drawParagraph(ctx,
    'The landlord may only seek possession of the property through the court, using one ' +
    'or more of the grounds set out in Schedule 2 of the Housing Act 1988 as amended by ' +
    "the Renters' Rights Act 2025. The landlord must serve the appropriate notice before " +
    'beginning court proceedings.',
    styles)

  drawNoticeBox(ctx,
    'Section 21 notices (no-fault eviction) have been abolished by the Renters\' Rights ' +
    'Act 2025 and cannot be used to end this tenancy.',
    36,
  )

  drawParagraph(ctx,
    'On leaving the property, the tenant shall return all keys and leave the property ' +
    'in a clean and tidy condition, with all fixtures and fittings in the same condition ' +
    'as at the start of the tenancy, allowing for fair wear and tear.',
    styles)

  // ── Section H: Additional Terms (if any) ────────────────────────────────

  const hasAdditionalTerms = data.clauses.length > 0 || data.specialConditions

  if (hasAdditionalTerms) {
    drawSectionHeader(ctx, 'Section H \u2014 Additional Terms')

    if (data.clauses.length > 0) {
      for (let i = 0; i < data.clauses.length; i++) {
        drawClauseBlock(ctx, i + 1, data.clauses[i].heading, data.clauses[i].body)
      }
    }

    if (data.specialConditions) {
      ensureSpace(ctx, 80)
      ctx.cursorY -= SPACING.blockGap
      drawText(ctx, 'Special Conditions', styles.sectionHeading, {})
      ctx.cursorY -= SPACING.blockGap

      const lines = data.specialConditions.split('\n')
      const boxH = Math.max(lines.length * 15 + 20, 50)

      drawRect(ctx.currentPage, MARGIN_LEFT, ctx.cursorY - boxH, CONTENT_WIDTH, boxH, {
        borderColor: COLORS.warningAmber,
        borderWidth: 1.5,
      })
      ctx.cursorY -= 10
      drawText(ctx, data.specialConditions, styles.body, {
        x: MARGIN_LEFT + 8,
        maxWidth: CONTENT_WIDTH - 16,
      })
      ctx.cursorY -= 10
    }
  }

  // ── Section I (or H): Signatures ────────────────────────────────────────

  const sigLabel = hasAdditionalTerms ? 'Section I' : 'Section H'
  drawSectionHeader(ctx, `${sigLabel} \u2014 Signatures`)

  const isSigned = !!data.landlordSignedAt

  if (isSigned) {
    // State B — signed electronically
    drawText(ctx, 'This agreement has been signed electronically via LetSorted.', styles.body, {})
    ctx.cursorY -= SPACING.sectionGap

    // Landlord
    drawText(ctx, `Landlord:  ${data.landlord.party.fullName}`, styles.subheading, {})
    ctx.cursorY -= SPACING.labelValueGap
    drawText(ctx, `Signed: ${formatDateTime(data.landlordSignedAt!)} UTC`, styles.body, {})
    if (data.landlordSignedIp) {
      drawText(ctx, `IP: ${maskIp(data.landlordSignedIp)}`, styles.caption, {})
    }
    ctx.cursorY -= SPACING.sectionGap

    // Tenants
    for (let i = 0; i < data.tenants.length; i++) {
      ensureSpace(ctx, 60)
      const label = data.tenants.length > 1 ? `Tenant ${i + 1}` : 'Tenant'
      drawText(ctx, `${label}:  ${data.tenants[i].party.fullName}`, styles.subheading, {})
      ctx.cursorY -= SPACING.labelValueGap
      if (data.tenantSignedAt) {
        drawText(ctx, `Signed: ${formatDateTime(data.tenantSignedAt)} UTC`, styles.body, {})
        if (data.tenantSignedIp) {
          drawText(ctx, `IP: ${maskIp(data.tenantSignedIp)}`, styles.caption, {})
        }
      } else {
        drawText(ctx, 'Awaiting signature', { ...styles.body, color: COLORS.textMuted }, {})
      }
      ctx.cursorY -= SPACING.sectionGap
    }
  } else {
    // State A — awaiting signatures
    drawText(ctx, 'This agreement will be signed electronically via LetSorted.', styles.body, {})
    drawText(ctx, 'Each party will receive a unique signing link by email.', styles.body, {})
    drawText(ctx,
      'By typing their full name on the signing page, each party confirms they have read ' +
      'and agree to the terms of this tenancy agreement. Their name, IP address, and ' +
      'timestamp will be recorded at the time of signing.',
      styles.body, {})
    ctx.cursorY -= SPACING.sectionGap

    // Landlord
    drawText(ctx, `Landlord:  ${data.landlord.party.fullName}`, styles.subheading, {})
    ctx.cursorY -= SPACING.labelValueGap
    drawText(ctx, 'Awaiting signature', { ...styles.body, color: COLORS.textMuted }, {})
    ctx.cursorY -= SPACING.sectionGap

    // Tenants
    for (let i = 0; i < data.tenants.length; i++) {
      ensureSpace(ctx, 40)
      const label = data.tenants.length > 1 ? `Tenant ${i + 1}` : 'Tenant'
      drawText(ctx, `${label}:  ${data.tenants[i].party.fullName}`, styles.subheading, {})
      ctx.cursorY -= SPACING.labelValueGap
      drawText(ctx, 'Awaiting signature', { ...styles.body, color: COLORS.textMuted }, {})
      ctx.cursorY -= SPACING.sectionGap
    }
  }

  ctx.cursorY -= SPACING.blockGap
  drawText(ctx,
    'This document was generated by LetSorted (letsorted.co.uk) from a pre-approved template ' +
    'based on the Gov.uk Model Tenancy Agreement, adapted for Assured Periodic Tenancies ' +
    "under the Renters' Rights Act 2025. It should be reviewed by a qualified solicitor before " +
    'signing if you have any doubts about its terms.',
    styles.legal,
    {},
  )

  // ── Headers and footers ─────────────────────────────────────────────────

  const totalPages = ctx.pages.length
  for (let i = 0; i < totalPages; i++) {
    if (i > 0) drawHeader(ctx.pages[i], ctx.fonts, 'Tenancy Agreement', ctx.logoImage)
    drawFooter(ctx.pages[i], ctx.fonts, i + 1, totalPages)
  }

  return finalize(ctx)
}
