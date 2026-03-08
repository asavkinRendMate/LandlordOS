// All LetSorted email templates — import from '@/lib/email-templates'

export { baseEmailTemplate, ctaButton, infoBox, greyBox, p, muted } from './base'

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

// ─── 9. Check-in review request (to tenant) ─────────────────────────────────
// Used by: api/check-in/[reportId] when status → PENDING

export function checkInReviewHtml(params: {
  tenantName: string
  landlordName: string
  propertyAddress: string
  reviewUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Please review your check-in report for ${params.propertyAddress}`,
    subtitle: 'Check-in Report',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p(`${params.landlordName} has prepared a check-in report for:`)}
      ${infoBox(params.propertyAddress)}
      ${p('Please review the photos documenting the condition of your new home. You can also add your own photos if you notice anything.')}
      ${ctaButton('Review check-in report', params.reviewUrl)}
      ${muted('This report protects both you and your landlord during deposit disputes.')}
    `,
  })
}

// ─── 10. Check-in tenant response (to landlord) ─────────────────────────────
// Used by: api/check-in/token/[token]/confirm

export function checkInTenantResponseHtml(params: {
  landlordName: string
  tenantName: string
  propertyAddress: string
  action: 'confirmed' | 'disputed' | 'added photos'
  checkInUrl: string
}): string {
  const actionText = params.action === 'confirmed'
    ? `${params.tenantName} has confirmed the check-in report is accurate.`
    : params.action === 'disputed'
      ? `${params.tenantName} has raised concerns about the check-in report.`
      : `${params.tenantName} has added photos to the check-in report.`

  return baseEmailTemplate({
    previewText: `${params.tenantName} has ${params.action} the check-in report`,
    subtitle: 'Check-in Report',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p(actionText)}
      ${infoBox(params.propertyAddress)}
      ${ctaButton('View check-in report', params.checkInUrl)}
    `,
  })
}

// ─── 11. Check-in complete (to tenant) ──────────────────────────────────────
// Used by: lib/check-in-pdf.ts after PDF generation

export function checkInCompleteHtml(params: {
  tenantName: string
  propertyAddress: string
  downloadUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Your check-in report is ready — ${params.propertyAddress}`,
    subtitle: 'Check-in Report',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p('Your check-in report has been agreed by both parties and the PDF is ready to download.')}
      ${infoBox(params.propertyAddress)}
      ${ctaButton('Download check-in report', params.downloadUrl)}
      ${muted('Keep this report safe — it documents the condition of the property at the start of your tenancy.')}
    `,
  })
}
