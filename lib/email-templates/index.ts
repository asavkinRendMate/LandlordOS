// All LetSorted email templates — import from '@/lib/email-templates'

export { baseEmailTemplate, ctaButton, infoBox, greyBox, p, muted } from './base'
export { contractSigningHtml, contractFullySignedLandlordHtml, contractFullySignedTenantHtml } from './contract'

import { baseEmailTemplate, ctaButton, infoBox, greyBox, p, muted } from './base'

// ─── 1. Tenant invite (join portal) ──────────────────────────────────────────
// Used by: api/tenant/invite, api/tenant/send-invite

export function tenantInviteHtml(params: {
  firstName: string
  propertyAddress: string
  joinLink: string
}): string {
  return baseEmailTemplate({
    previewText: `Confirm your details for ${params.propertyAddress}`,
    subtitle: 'Tenant Portal',
    content: `
      ${p(`Hi ${params.firstName},`)}
      ${p(`Your landlord uses <strong style="color:#1a1a1a;">LetSorted</strong> to manage their property at:`)}
      ${infoBox(params.propertyAddress)}
      ${p('Please confirm your details and access your tenant portal:')}
      ${ctaButton('Confirm my details', params.joinLink)}
      ${muted("If you weren't expecting this email, you can safely ignore it.")}
    `,
  })
}

// ─── 2. Application received (confirmation to applicant) ─────────────────────
// Used by: api/tenant/apply (first email)

export function applicationReceivedHtml(params: {
  firstName: string
  propertyAddress: string
  landlordFirstName: string
}): string {
  return baseEmailTemplate({
    previewText: `Application received for ${params.propertyAddress}`,
    subtitle: 'Applications',
    content: `
      ${p(`Hi ${params.firstName},`)}
      ${p(`Thanks for applying for:`)}
      ${infoBox(params.propertyAddress)}
      ${p(`${params.landlordFirstName} will be in touch if your application is successful.`)}
    `,
  })
}

// ─── 3. New application notification (to landlord) ───────────────────────────
// Used by: api/tenant/apply (second email)

export function newApplicationHtml(params: {
  landlordFirstName: string
  propertyAddress: string
  applicantName: string
  applicantEmail: string
  message?: string
}): string {
  return baseEmailTemplate({
    previewText: `New application from ${params.applicantName}`,
    subtitle: 'Applications',
    content: `
      ${p(`Hi ${params.landlordFirstName},`)}
      ${p(`You have a new application for <strong style="color:#1a1a1a;">${params.propertyAddress}</strong> from <strong style="color:#1a1a1a;">${params.applicantName}</strong> (${params.applicantEmail}).`)}
      ${params.message ? greyBox(`<p style="color:#374151;font-size:14px;font-style:italic;margin:0;">&ldquo;${params.message}&rdquo;</p>`) : ''}
      ${p('Log in to LetSorted to view and manage this application.')}
    `,
  })
}

// ─── 4. Application link (send apply URL to prospective tenant) ──────────────
// Used by: api/tenant/application-link-email

export function applicationLinkHtml(params: {
  propertyAddress: string
  applyLink: string
}): string {
  return baseEmailTemplate({
    previewText: `Apply for ${params.propertyAddress}`,
    subtitle: 'Applications',
    content: `
      ${p('Hi,')}
      ${p("You've been sent an application link for:")}
      ${infoBox(params.propertyAddress)}
      ${p('Click below to submit your application:')}
      ${ctaButton('Apply now', params.applyLink)}
    `,
  })
}

// ─── 5. Screening invite (financial check request to candidate) ──────────────
// Used by: api/screening/invite

export function candidateInviteHtml(params: {
  candidateName: string
  landlordName: string
  propertyAddress: string
  applyUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Complete your financial check for ${params.propertyAddress}`,
    subtitle: 'Financial Screening',
    content: `
      ${p(`Hi ${params.candidateName},`)}
      ${p(`${params.landlordName} has invited you to complete a financial check for:`)}
      ${infoBox(params.propertyAddress)}
      ${p("Upload your bank statements (PDF) and you'll get a financial score in under 2 minutes. Your data is processed securely and never shared without your permission.")}
      ${ctaButton('Start check', params.applyUrl)}
      ${muted('This link expires in 7 days. If you have questions, reply to this email or contact your landlord directly.')}
    `,
  })
}

// ─── 6. Tenant selected (winner notification) ───────────────────────────────
// Used by: api/screening/select-tenant

export function tenantSelectedHtml(params: {
  candidateName: string
  propertyAddress: string
  landlordName: string
  portalLink: string
}): string {
  return baseEmailTemplate({
    previewText: `Great news — you've been selected for ${params.propertyAddress}`,
    subtitle: 'Applications',
    content: `
      ${p(`Hi ${params.candidateName},`)}
      ${p(`Great news! <strong style="color:#1a1a1a;">${params.landlordName}</strong> has selected you as their tenant for:`)}
      ${infoBox(params.propertyAddress)}
      ${p('<strong style="color:#1a1a1a;">What happens next:</strong>')}
      ${greyBox(`
        <ol style="color:#374151;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
          <li>Confirm your details via the tenant portal</li>
          <li>Upload your Right to Rent documents</li>
          <li>Review and sign your tenancy agreement</li>
          <li>Set up your deposit protection</li>
        </ol>
      `)}
      ${ctaButton('Open tenant portal', params.portalLink)}
      ${muted('If you have any questions, reply to this email or contact your landlord directly.')}
    `,
  })
}

// ─── 7. Applicant rejected (polite rejection) ───────────────────────────────
// Used by: api/screening/select-tenant

export function applicantRejectedHtml(params: {
  candidateName: string
  propertyAddress: string
  landlordName: string
}): string {
  return baseEmailTemplate({
    previewText: `Update on your application for ${params.propertyAddress}`,
    subtitle: 'Applications',
    content: `
      ${p(`Hi ${params.candidateName},`)}
      ${p(`Thank you for your interest in:`)}
      ${infoBox(params.propertyAddress)}
      ${p(`Unfortunately, <strong style="color:#1a1a1a;">${params.landlordName}</strong> has decided to go with another applicant for this property.`)}
      ${p('We appreciate the time you took to apply and wish you the best in your property search.')}
      ${muted('This is an automated notification. Please do not reply to this email.')}
    `,
  })
}

// ─── 8. Landlord notification (screening complete) ───────────────────────────
// Used by: lib/scoring/engine.ts

export function landlordNotificationHtml(params: {
  candidateName: string
  score: number
  grade: string
  reportUrl: string
}): string {
  const gradeColor =
    params.grade === 'Excellent' || params.grade === 'Good'
      ? '#16a34a'
      : params.grade === 'Fair'
        ? '#d97706'
        : '#dc2626'

  return baseEmailTemplate({
    previewText: `${params.candidateName} scored ${params.score}/100 — ${params.grade}`,
    subtitle: 'Financial Screening',
    content: `
      ${p(`${params.candidateName} has completed their financial check.`)}
      ${greyBox(`
        <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;text-align:center;">Financial Score</p>
        <p style="color:#1a1a1a;font-size:28px;font-weight:800;margin:0;text-align:center;">${params.score}/100</p>
        <p style="color:${gradeColor};font-size:14px;font-weight:600;margin:4px 0 0;text-align:center;">${params.grade}</p>
      `)}
      ${ctaButton('View full report', params.reportUrl)}
      ${muted('Unlock the full report to see the AI summary, detailed breakdown, and applied rules.')}
    `,
  })
}

// ─── 9. Inspection review request (to tenant) ───────────────────────────────
// Used by: api/inspections/[reportId] when status → PENDING

export function inspectionReviewHtml(params: {
  tenantName: string
  landlordName: string
  propertyAddress: string
  reviewUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Please review your property inspection report for ${params.propertyAddress}`,
    subtitle: 'Property Inspection',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p(`${params.landlordName} has prepared a property inspection report for:`)}
      ${infoBox(params.propertyAddress)}
      ${p('Please review the photos documenting the condition of your new home. You can also add your own photos if you notice anything.')}
      ${ctaButton('Review inspection report', params.reviewUrl)}
      ${muted('This report protects both you and your landlord during deposit disputes.')}
    `,
  })
}

// ─── 10. Inspection tenant response (to landlord) ───────────────────────────
// Used by: api/inspections/token/[token]/confirm

export function inspectionTenantResponseHtml(params: {
  landlordName: string
  tenantName: string
  propertyAddress: string
  action: 'confirmed' | 'disputed' | 'added photos'
  checkInUrl: string
  note?: string
}): string {
  const actionText = params.action === 'confirmed'
    ? `${params.tenantName} has confirmed the inspection report is accurate.`
    : params.action === 'disputed'
      ? `${params.tenantName} has raised concerns about the inspection report.`
      : `${params.tenantName} has added photos to the inspection report.`

  return baseEmailTemplate({
    previewText: `${params.tenantName} has ${params.action} the inspection report`,
    subtitle: 'Property Inspection',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(actionText)}
      ${params.note ? greyBox(`<p style="color:#374151;font-size:14px;font-style:italic;margin:0;">&ldquo;${params.note}&rdquo;</p>`) : ''}
      ${infoBox(params.propertyAddress)}
      ${ctaButton('View inspection report', params.checkInUrl)}
    `,
  })
}

// ─── 11. Inspection complete (to tenant) ────────────────────────────────────
// Used by: lib/inspection-pdf.ts after PDF generation

export function inspectionCompleteHtml(params: {
  tenantName: string
  propertyAddress: string
  downloadUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Your property inspection report is ready — ${params.propertyAddress}`,
    subtitle: 'Property Inspection',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p('Your property inspection report has been agreed by both parties and the PDF is ready to download.')}
      ${infoBox(params.propertyAddress)}
      ${ctaButton('Download inspection report', params.downloadUrl)}
      ${muted('Keep this report safe — it documents the condition of the property at the start of your tenancy.')}
    `,
  })
}

// ─── 12. Compliance expiry 30 days (to landlord) ────────────────────────────
// Used by: lib/notifications/cron-compliance.ts

export function complianceExpiry30dHtml(params: {
  landlordName: string
  documentType: string
  propertyAddress: string
  expiryDate: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `${params.documentType} expires in 30 days — ${params.propertyAddress}`,
    subtitle: 'Compliance',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(`Your <strong style="color:#1a1a1a;">${params.documentType}</strong> for the property below expires on <strong style="color:#1a1a1a;">${params.expiryDate}</strong>.`)}
      ${infoBox(params.propertyAddress)}
      ${p('Now is a good time to arrange a renewal so you stay compliant.')}
      ${ctaButton('View property', params.dashboardUrl)}
      ${muted('You will receive another reminder 7 days before expiry.')}
    `,
  })
}

// ─── 13. Compliance expiry 7 days (to landlord) ─────────────────────────────
// Used by: lib/notifications/cron-compliance.ts

export function complianceExpiry7dHtml(params: {
  landlordName: string
  documentType: string
  propertyAddress: string
  expiryDate: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Urgent: ${params.documentType} expires in 7 days — ${params.propertyAddress}`,
    subtitle: 'Compliance',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(`Your <strong style="color:#1a1a1a;">${params.documentType}</strong> for the property below expires on <strong style="color:#d97706;">${params.expiryDate}</strong>.`)}
      ${infoBox(params.propertyAddress)}
      ${p('Please arrange a renewal urgently to avoid becoming non-compliant.')}
      ${ctaButton('View property', params.dashboardUrl)}
      ${muted('Letting a compliance document expire may result in fines under the Renters\' Rights Act 2025.')}
    `,
  })
}

// ─── 14. Compliance expired (to landlord) ───────────────────────────────────
// Used by: lib/notifications/cron-compliance.ts

export function complianceExpiredHtml(params: {
  landlordName: string
  documentType: string
  propertyAddress: string
  expiredDate: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Overdue: ${params.documentType} has expired — ${params.propertyAddress}`,
    subtitle: 'Compliance',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(`Your <strong style="color:#1a1a1a;">${params.documentType}</strong> for the property below expired on <strong style="color:#dc2626;">${params.expiredDate}</strong>.`)}
      ${infoBox(params.propertyAddress)}
      ${p('<strong style="color:#dc2626;">You may be non-compliant.</strong> Under the Renters\' Rights Act 2025, landlords can face fines of up to \u00a340,000 for failing to maintain valid compliance documents.')}
      ${p('Please arrange a renewal as soon as possible and upload the new certificate.')}
      ${ctaButton('View property', params.dashboardUrl)}
    `,
  })
}

// ─── 15. Deposit unprotected warning (to landlord) ──────────────────────────
// Used by: lib/notifications/cron-compliance.ts

// ─── 16. New maintenance request (to landlord) ─────────────────────────────
// Used by: api/maintenance POST handler

export function maintenanceNewRequestHtml(params: {
  landlordName: string
  tenantName: string
  propertyAddress: string
  requestTitle: string
  description: string
  priority: string
  photosCount: number
  dashboardUrl: string
}): string {
  const priorityColors: Record<string, string> = {
    URGENT: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#d97706',
    LOW: '#6b7280',
  }
  const color = priorityColors[params.priority] || '#6b7280'

  return baseEmailTemplate({
    previewText: `${params.priority} maintenance request: ${params.requestTitle} — ${params.propertyAddress}`,
    subtitle: 'Maintenance',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(`<strong style="color:#1a1a1a;">${params.tenantName}</strong> has submitted a new maintenance request for:`)}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Title:</strong> ${params.requestTitle}</p>
        <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Priority:</strong> <span style="color:${color};font-weight:600;">${params.priority}</span></p>
        <p style="color:#374151;font-size:14px;margin:0 0 ${params.photosCount > 0 ? '8px' : '0'};">${params.description}</p>
        ${params.photosCount > 0 ? `<p style="color:#6b7280;font-size:13px;margin:0;">${params.photosCount} photo${params.photosCount === 1 ? '' : 's'} attached</p>` : ''}
      `)}
      ${ctaButton('View request', params.dashboardUrl)}
    `,
  })
}

// ─── 17. Maintenance tenant confirmation (to tenant) ────────────────────────
// Used by: api/maintenance POST handler

export function maintenanceTenantConfirmationHtml(params: {
  tenantName: string
  requestTitle: string
  propertyAddress: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `We've received your maintenance request — ${params.requestTitle}`,
    subtitle: 'Maintenance',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p(`We've received your maintenance request for:`)}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`<p style="color:#374151;font-size:14px;margin:0;"><strong>${params.requestTitle}</strong></p>`)}
      ${p('Your landlord has been notified and will be in touch.')}
      ${ctaButton('View your request', params.dashboardUrl)}
      ${muted("You'll receive an email when the status of your request changes.")}
    `,
  })
}

// ─── 18. Maintenance status update (to landlord) ────────────────────────────
// Used by: api/maintenance/[id] PATCH handler

export function maintenanceStatusUpdateLandlordHtml(params: {
  landlordName: string
  requestTitle: string
  propertyAddress: string
  tenantName: string
  oldStatus: string
  newStatus: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Maintenance update: ${params.requestTitle} — ${params.propertyAddress}`,
    subtitle: 'Maintenance',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(`The status of a maintenance request from <strong style="color:#1a1a1a;">${params.tenantName}</strong> has been updated.`)}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>${params.requestTitle}</strong></p>
        <p style="color:#374151;font-size:14px;margin:0;">${params.oldStatus} &rarr; <strong style="color:#1a1a1a;">${params.newStatus}</strong></p>
      `)}
      ${ctaButton('View request', params.dashboardUrl)}
    `,
  })
}

// ─── 19. Maintenance status update (to tenant) ─────────────────────────────
// Used by: api/maintenance/[id] PATCH handler

export function maintenanceStatusUpdateTenantHtml(params: {
  tenantName: string
  requestTitle: string
  propertyAddress: string
  oldStatus: string
  newStatus: string
  landlordNote?: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Update on your maintenance request — ${params.requestTitle}`,
    subtitle: 'Maintenance',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p('Your maintenance request has been updated.')}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>${params.requestTitle}</strong></p>
        <p style="color:#374151;font-size:14px;margin:0;">${params.oldStatus} &rarr; <strong style="color:#1a1a1a;">${params.newStatus}</strong></p>
      `)}
      ${params.landlordNote ? greyBox(`<p style="color:#374151;font-size:14px;font-style:italic;margin:0;">&ldquo;${params.landlordNote}&rdquo;</p>`) : ''}
      ${ctaButton('View your request', params.dashboardUrl)}
    `,
  })
}

// ─── 20. Awaab's Law timer expiring (to landlord) ──────────────────────────
// Used by: api/maintenance POST handler + lib/notifications/cron-awaabs.ts

export function awaabsLawExpiringHtml(params: {
  landlordName: string
  propertyAddress: string
  tenantName: string
  requestTitle: string
  createdAt: string
  respondByDeadline: string
  hoursRemaining: number
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `URGENT: response required in ${params.hoursRemaining}h — ${params.propertyAddress}`,
    subtitle: 'Maintenance',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(`A damp or mould complaint from <strong style="color:#1a1a1a;">${params.tenantName}</strong> requires your response within <strong style="color:#dc2626;">${params.hoursRemaining} hours</strong>.`)}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>${params.requestTitle}</strong></p>
        <p style="color:#374151;font-size:14px;margin:0 0 4px;"><strong>Reported:</strong> ${params.createdAt}</p>
        <p style="color:#dc2626;font-size:14px;font-weight:600;margin:0;"><strong>Deadline:</strong> ${params.respondByDeadline}</p>
      `)}
      ${p('<strong style="color:#dc2626;">Awaab\'s Law (private rentals from 2026)</strong> requires landlords to respond to damp and mould complaints within 24 hours. Non-compliance can result in fines of up to \u00a340,000.')}
      ${ctaButton('View request', params.dashboardUrl)}
    `,
  })
}

// ─── 21. Rent due reminder — 5 days (to tenant) ───────────────────────────
// Used by: lib/notifications/cron-rent-reminders.ts

export function rentDueReminder5dHtml(params: {
  tenantName: string
  propertyAddress: string
  amount: string
  dueDate: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Reminder: rent of ${params.amount} due in 5 days — ${params.propertyAddress}`,
    subtitle: 'Rent',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p(`Your rent of <strong style="color:#1a1a1a;">${params.amount}</strong> is due on <strong style="color:#1a1a1a;">${params.dueDate}</strong>.`)}
      ${infoBox(params.propertyAddress)}
      ${p('Please arrange payment with your landlord before the due date.')}
      ${ctaButton('View tenant portal', params.dashboardUrl)}
      ${muted('If you have already arranged payment, you can safely ignore this reminder.')}
    `,
  })
}

// ─── 22. Rent due today (to tenant) ────────────────────────────────────────
// Used by: lib/notifications/cron-rent-reminders.ts

export function rentDueTodayHtml(params: {
  tenantName: string
  propertyAddress: string
  amount: string
  dueDate: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Your rent of ${params.amount} is due today — ${params.propertyAddress}`,
    subtitle: 'Rent',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p(`Your rent of <strong style="color:#1a1a1a;">${params.amount}</strong> is due today.`)}
      ${infoBox(params.propertyAddress)}
      ${p('Please arrange payment as soon as possible.')}
      ${ctaButton('View tenant portal', params.dashboardUrl)}
      ${muted('If you have already paid, you can safely ignore this reminder.')}
    `,
  })
}

// ─── 23. Rent overdue (to tenant) ──────────────────────────────────────────
// Used by: lib/notifications/cron-rent-reminders.ts

export function rentOverdueHtml(params: {
  tenantName: string
  propertyAddress: string
  amount: string
  dueDate: string
  daysPastDue: number
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Overdue: rent payment of ${params.amount} — ${params.propertyAddress}`,
    subtitle: 'Rent',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p(`Your rent of <strong style="color:#1a1a1a;">${params.amount}</strong> was due on <strong style="color:#dc2626;">${params.dueDate}</strong> (${params.daysPastDue} day${params.daysPastDue === 1 ? '' : 's'} ago).`)}
      ${infoBox(params.propertyAddress)}
      ${p('Please contact your landlord to arrange payment.')}
      ${ctaButton('View tenant portal', params.dashboardUrl)}
      ${muted("If you've already paid, please ignore this reminder.")}
    `,
  })
}

// ─── 24. Inspection notice (legally required — to tenant) ──────────────────
// Used by: api/inspections/[reportId]/notice
// Section 11, Landlord and Tenant Act 1985 — at least 24h written notice

export function inspectionNoticeHtml(params: {
  tenantName: string
  propertyAddress: string
  scheduledDate: string
  scheduledTime?: string
  landlordName: string
  acknowledgeUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Property inspection scheduled — ${params.propertyAddress}`,
    subtitle: 'Inspection Notice',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p(`Your landlord, <strong style="color:#1a1a1a;">${params.landlordName}</strong>, has scheduled a property inspection at:`)}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <strong>Scheduled date:</strong> ${params.scheduledDate}${params.scheduledTime ? `<br /><strong>Scheduled time:</strong> ${params.scheduledTime}` : ''}
      `)}
      ${p('Under Section 11 of the Landlord and Tenant Act 1985, your landlord must give you at least 24 hours\' written notice before entering the property for an inspection. This email serves as that notice.')}
      ${p('Please acknowledge receipt of this notice:')}
      ${ctaButton('Acknowledge notice', params.acknowledgeUrl)}
      ${muted('You do not need to be present during the inspection, but you are welcome to be.')}
    `,
  })
}

// ─── 25. Inspection reminder (7 days before — to landlord) ────────────────
// Used by: api/cron/inspections

export function inspectionReminderHtml(params: {
  landlordName: string
  propertyAddress: string
  scheduledDate: string
  tenantName: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Inspection due soon — ${params.propertyAddress}`,
    subtitle: 'Inspections',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(`A periodic inspection is due soon for:`)}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <strong>Next due:</strong> ${params.scheduledDate}<br />
        <strong>Tenant:</strong> ${params.tenantName}
      `)}
      ${p('Remember to send the tenant at least 24 hours\' written notice before entering the property.')}
      ${ctaButton('View property', params.dashboardUrl)}
    `,
  })
}

// ─── 26. Inspection day-of reminder (to landlord) ────────────────────────────
// Used by: lib/notifications/cron-inspections.ts (Pass 2)

export function inspectionDayLandlordHtml(params: {
  landlordName: string
  propertyAddress: string
  scheduledDate: string
  scheduledTime?: string
  tenantName: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Today: property inspection at ${params.propertyAddress}`,
    subtitle: 'Inspections',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p('You have a property inspection scheduled for today.')}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <strong>Date:</strong> ${params.scheduledDate}${params.scheduledTime ? `<br /><strong>Time:</strong> ${params.scheduledTime}` : ''}<br />
        <strong>Tenant:</strong> ${params.tenantName}
      `)}
      ${p('Remember to bring your camera or phone to document the property condition.')}
      ${ctaButton('View property', params.dashboardUrl)}
    `,
  })
}

// ─── 27. Inspection day-of reminder (to tenant) ─────────────────────────────
// Used by: lib/notifications/cron-inspections.ts (Pass 2)

export function inspectionDayTenantHtml(params: {
  tenantName: string
  propertyAddress: string
  scheduledDate: string
  scheduledTime?: string
  landlordName: string
}): string {
  return baseEmailTemplate({
    previewText: `Property inspection today at ${params.propertyAddress}`,
    subtitle: 'Inspections',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p(`Your landlord, <strong style="color:#1a1a1a;">${params.landlordName}</strong>, has a property inspection scheduled for today.`)}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <strong>Date:</strong> ${params.scheduledDate}${params.scheduledTime ? `<br /><strong>Time:</strong> ${params.scheduledTime}` : ''}
      `)}
      ${p('You do not need to be present during the inspection, but you are welcome to be.')}
      ${muted('This is a routine inspection as required under your tenancy agreement.')}
    `,
  })
}

export function depositUnprotectedWarningHtml(params: {
  landlordName: string
  propertyAddress: string
  tenantName: string
  tenancyStartDate: string
  deadlineDate: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Deposit must be protected by ${params.deadlineDate} — ${params.propertyAddress}`,
    subtitle: 'Deposit Protection',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(`The deposit for <strong style="color:#1a1a1a;">${params.tenantName}</strong> at the property below has not yet been protected.`)}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <p style="color:#374151;font-size:14px;margin:0 0 4px;"><strong>Tenancy started:</strong> ${params.tenancyStartDate}</p>
        <p style="color:#dc2626;font-size:14px;font-weight:600;margin:0;"><strong>Protection deadline:</strong> ${params.deadlineDate}</p>
      `)}
      ${p('By law, you must protect your tenant\'s deposit in a government-approved scheme within 30 days of receiving it. Failure to do so can result in a court order to repay up to 3x the deposit amount.')}
      ${ctaButton('View property', params.dashboardUrl)}
    `,
  })
}
