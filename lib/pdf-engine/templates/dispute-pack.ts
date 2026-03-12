/**
 * templates/dispute-pack.ts — Multi-section evidence pack for deposit dispute.
 *
 * Structure:
 * 1. Cover page
 * 2. Executive summary + addressed-to banner
 * 3. Section A: Maintenance history
 * 4. Section B: Rent payment history
 * 5. Section C: Documents on file
 * 6. Section D: Inspection vs Check-out photos
 * 7. Section E: Event timeline
 * 8. Section F: Template letters
 */

import type { DisputePackData } from '../types'
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
import { drawTable, drawKeyValueTable } from '../components/table'
import { drawPhotoGrid } from '../components/photo-grid'

const ADDRESSED_TO_TEXT: Record<string, string> = {
  deposit_scheme: 'Prepared for submission to Alternative Dispute Resolution service',
  tribunal: 'Prepared for submission to the First-tier Tribunal (Property Chamber)',
  ombudsman: 'Prepared for submission to the Property Ombudsman',
  court: 'Prepared for use in County Court proceedings',
}

function drawSectionDivider(ctx: RenderContext, letter: string, title: string) {
  addPage(ctx)
  // Full-width green block
  drawRect(ctx.currentPage, 0, PAGE_HEIGHT - 300, PAGE_WIDTH, 300, {
    color: COLORS.brandGreen,
  })
  // Section letter
  ctx.currentPage.drawText(letter, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 200,
    size: 60,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })
  // Section title
  ctx.currentPage.drawText(title, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 240,
    size: 20,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })
}

export async function renderDisputePack(data: DisputePackData): Promise<{ buffer: Buffer; pageCount: number }> {
  const ctx = await createRenderContext('Dispute Evidence Pack', {
    drawHeader: true,
    skipHeaderOnFirstPage: true,
  })
  const styles = TEXT_STYLES(ctx.fonts)
  const address = formatAddress(data.property)

  // ── Page 1: Cover ────────────────────────────────────────────────────────

  drawRect(ctx.currentPage, 0, PAGE_HEIGHT - 220, PAGE_WIDTH, 220, {
    color: COLORS.brandGreen,
  })

  ctx.currentPage.drawText('Dispute Evidence Pack', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 100,
    size: 24,
    font: ctx.fonts.bold,
    color: COLORS.white,
  })

  ctx.currentPage.drawText(address, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 130,
    size: 12,
    font: ctx.fonts.regular,
    color: COLORS.white,
  })

  // Addressed-to label
  const addressedLabel = ADDRESSED_TO_TEXT[data.addressedTo] ?? ''
  if (addressedLabel) {
    ctx.currentPage.drawText(addressedLabel, {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 160,
      size: 10,
      font: ctx.fonts.regular,
      color: COLORS.white,
    })
  }

  ctx.currentPage.drawText(`Generated: ${formatDate(data.generatedAt)}`, {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 250,
    size: 10,
    font: ctx.fonts.regular,
    color: COLORS.textSecondary,
  })

  // ── Page 2: Executive summary ──────────────────────────────────────────

  addPage(ctx)

  // Addressed-to banner
  if (addressedLabel) {
    drawRect(ctx.currentPage, MARGIN_LEFT, ctx.cursorY - 24, CONTENT_WIDTH, 24, {
      color: COLORS.brandGreenLight,
      borderColor: COLORS.brandGreen,
      borderWidth: 1,
    })
    ctx.currentPage.drawText(addressedLabel, {
      x: MARGIN_LEFT + 8,
      y: ctx.cursorY - 17,
      size: 8,
      font: ctx.fonts.regular,
      color: COLORS.brandGreen,
    })
    ctx.cursorY -= 24 + SPACING.sectionGap
  }

  drawText(ctx, 'Executive Summary', styles.title, {})
  ctx.cursorY -= SPACING.blockGap

  drawText(ctx, data.disputeSummary, styles.body, {})
  ctx.cursorY -= SPACING.sectionGap

  drawKeyValueTable(ctx, [
    { label: 'Tenancy Start', value: formatDate(data.tenancyStartDate) },
    ...(data.tenancyEndDate ? [{ label: 'Tenancy End', value: formatDate(data.tenancyEndDate) }] : []),
    { label: 'Deposit Amount', value: formatPence(data.depositPence) },
    { label: 'Deposit Scheme', value: data.depositScheme },
    { label: 'Deposit Reference', value: data.depositReference },
  ], { bordered: true })

  ctx.cursorY -= SPACING.sectionGap

  // Parties
  drawPartyBlock(ctx, data.landlord, { label: 'Landlord' })
  ctx.cursorY -= SPACING.blockGap
  drawPartyBlock(ctx, data.tenant, { label: 'Tenant' })

  // ── Section A: Maintenance history ─────────────────────────────────────

  drawSectionDivider(ctx, 'A', 'Maintenance History')
  addPage(ctx)

  drawText(ctx, 'Maintenance Tickets', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.blockGap

  if (data.maintenanceTickets.length > 0) {
    drawTable(ctx, [
      { header: 'Date', width: 80 },
      { header: 'Category', width: 100 },
      { header: 'Priority', width: 60 },
      { header: 'Status', width: 70 },
      { header: 'Description', width: 173 },
    ], data.maintenanceTickets.map(t => ({
      cells: [
        formatDate(t.submittedAt),
        t.category,
        t.priority,
        t.status,
        t.description.slice(0, 40),
      ],
      highlight: t.priority === 'URGENT' ? 'red' as const : undefined,
    })))

    // Detail pages for UNRESOLVED or URGENT tickets with photos
    const detailTickets = data.maintenanceTickets.filter(
      t => (t.status !== 'RESOLVED' || t.priority === 'URGENT') && t.photos.length > 0
    )

    for (const ticket of detailTickets) {
      addPage(ctx)
      drawText(ctx, `${ticket.category} — ${ticket.priority}`, styles.sectionHeading, {})
      ctx.cursorY -= SPACING.labelValueGap
      drawText(ctx, `Submitted: ${formatDateTime(ticket.submittedAt)}`, styles.caption, {})
      drawText(ctx, `Status: ${ticket.status}`, styles.caption, {})
      ctx.cursorY -= SPACING.blockGap
      drawText(ctx, ticket.description, styles.body, {})

      if (ticket.resolutionNotes) {
        ctx.cursorY -= SPACING.blockGap
        drawText(ctx, 'Resolution Notes:', styles.subheading, {})
        drawText(ctx, ticket.resolutionNotes, styles.body, {})
      }

      if (ticket.photos.length > 0) {
        ctx.cursorY -= SPACING.blockGap
        await drawPhotoGrid(ctx, ticket.photos)
      }
    }
  } else {
    drawText(ctx, 'No maintenance tickets recorded.', styles.body, {})
  }

  // ── Section B: Rent payment history ────────────────────────────────────

  drawSectionDivider(ctx, 'B', 'Rent Payment History')
  addPage(ctx)

  drawText(ctx, 'Payment Records', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.blockGap

  if (data.rentHistory.length > 0) {
    drawTable(ctx, [
      { header: 'Due Date', width: 90 },
      { header: 'Amount Due', width: 100 },
      { header: 'Amount Paid', width: 100 },
      { header: 'Status', width: 80 },
      { header: 'Paid At', width: 113 },
    ], data.rentHistory.map(r => ({
      cells: [
        formatDate(r.dueDate),
        formatPence(r.amountDuePence),
        formatPence(r.amountPaidPence),
        r.status,
        r.paidAt ? formatDate(r.paidAt) : '-',
      ],
      highlight: (r.status === 'LATE' || r.status === 'PARTIAL') ? 'amber' as const : undefined,
    })))

    // Summary
    ctx.cursorY -= SPACING.sectionGap
    const totalDue = data.rentHistory.reduce((s, r) => s + r.amountDuePence, 0)
    const totalPaid = data.rentHistory.reduce((s, r) => s + r.amountPaidPence, 0)
    const outstanding = totalDue - totalPaid

    drawKeyValueTable(ctx, [
      { label: 'Total Due', value: formatPence(totalDue) },
      { label: 'Total Paid', value: formatPence(totalPaid) },
      { label: 'Outstanding', value: formatPence(outstanding) },
    ], { bordered: true })
  } else {
    drawText(ctx, 'No rent payment records.', styles.body, {})
  }

  // ── Section C: Documents on file ───────────────────────────────────────

  drawSectionDivider(ctx, 'C', 'Documents on File')
  addPage(ctx)

  drawText(ctx, 'Documents', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.blockGap

  if (data.documents.length > 0) {
    drawTable(ctx, [
      { header: 'Document', width: 180 },
      { header: 'Type', width: 140 },
      { header: 'Uploaded', width: 90 },
      { header: 'Status', width: 73 },
    ], data.documents.map(d => ({
      cells: [
        d.name,
        d.type,
        formatDate(d.uploadedAt),
        d.url ? 'On file' : 'Missing',
      ],
    })))
  } else {
    drawText(ctx, 'No documents recorded.', styles.body, {})
  }

  // ── Section D: Inspection vs Check-out photos ───────────────────────────

  drawSectionDivider(ctx, 'D', 'Inspection vs Check-out Comparison')
  addPage(ctx)

  const hasInspection = data.inspectionPhotos && data.inspectionPhotos.length > 0
  const hasCheckOut = data.checkOutPhotos && data.checkOutPhotos.length > 0

  if (hasInspection || hasCheckOut) {
    if (hasInspection) {
      drawText(ctx, 'Inspection Photos', styles.sectionHeading, {})
      ctx.cursorY -= SPACING.blockGap
      await drawPhotoGrid(ctx, data.inspectionPhotos!)
      ctx.cursorY -= SPACING.sectionGap
    }

    if (hasCheckOut) {
      ensureSpace(ctx, 200)
      drawText(ctx, 'Check-out Photos', styles.sectionHeading, {})
      ctx.cursorY -= SPACING.blockGap
      await drawPhotoGrid(ctx, data.checkOutPhotos!)
    }
  } else {
    drawText(ctx, 'No inspection or check-out photos provided.', styles.body, {})
  }

  // ── Section E: Event timeline ─────────────────────────────────────────

  drawSectionDivider(ctx, 'E', 'Event Timeline')
  addPage(ctx)

  drawText(ctx, 'Chronological Event Log', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.blockGap

  if (data.eventLog.length > 0) {
    drawTable(ctx, [
      { header: 'Date', width: 110 },
      { header: 'Actor', width: 80 },
      { header: 'Event', width: 293 },
    ], data.eventLog.map((e) => ({
      cells: [
        formatDateTime(e.occurredAt),
        e.actor.charAt(0).toUpperCase() + e.actor.slice(1),
        e.description.slice(0, 70),
      ],
    })), { alternateShading: true })
  } else {
    drawText(ctx, 'No events recorded.', styles.body, {})
  }

  // ── Section F: Template letters ───────────────────────────────────────

  drawSectionDivider(ctx, 'F', 'Template Letters')
  addPage(ctx)

  drawText(ctx, 'Ombudsman Cover Letter', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.blockGap

  const ombudsmanLetter = `Dear Sir/Madam,

I am writing to submit evidence in connection with a dispute regarding the tenancy deposit for the property at [PROPERTY ADDRESS].

The tenancy commenced on [START DATE] and the deposit of [DEPOSIT AMOUNT] was protected with [DEPOSIT SCHEME] under reference [DEPOSIT REFERENCE].

I enclose a comprehensive evidence pack including:
- Maintenance request history and photographic evidence
- Rent payment records
- Copies of all documents served during the tenancy
- Inspection and check-out photographic comparison
- A chronological timeline of events

I would be grateful if you would consider this evidence and make a determination.

Yours faithfully,
[LANDLORD NAME]`

  drawText(ctx, ombudsmanLetter, styles.body, {})

  // Second letter
  addPage(ctx)

  drawText(ctx, 'Tribunal Statement Template', styles.sectionHeading, {})
  ctx.cursorY -= SPACING.blockGap

  const tribunalStatement = `IN THE FIRST-TIER TRIBUNAL (PROPERTY CHAMBER)

CASE NUMBER: [FILL IN]

BETWEEN:

[LANDLORD NAME] (Applicant)
- and -
[TENANT NAME] (Respondent)

STATEMENT OF [LANDLORD NAME]

1. I am the landlord of the property at [PROPERTY ADDRESS] and I make this statement from my own knowledge and from records in my possession.

2. The tenancy commenced on [START DATE] under an Assured Periodic Tenancy.

3. A deposit of [DEPOSIT AMOUNT] was taken and protected with [DEPOSIT SCHEME] under reference [DEPOSIT REFERENCE].

4. [FILL IN — describe the dispute, the condition of the property, and the basis for any deductions claimed]

5. I refer to the accompanying evidence pack which contains photographic evidence, maintenance records, and payment history supporting the matters set out above.

6. I respectfully request that the Tribunal [FILL IN — state the outcome sought].

STATEMENT OF TRUTH

I believe that the facts stated in this statement are true. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.

Signed: ____________________
Date: ____________________`

  drawText(ctx, tribunalStatement, styles.body, {})

  // ── Headers and footers ─────────────────────────────────────────────────

  const totalPages = ctx.pages.length
  for (let i = 0; i < totalPages; i++) {
    const page = ctx.pages[i]
    // Skip header on cover (0) and section divider pages (those with green blocks)
    if (i > 0) {
      drawHeader(page, ctx.fonts, 'Dispute Evidence Pack', ctx.logoImage)
    }
    drawFooter(page, ctx.fonts, i + 1, totalPages)
  }

  return finalize(ctx)
}
