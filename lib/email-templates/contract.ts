// Contract signing email templates
// Used by: api/contracts/generate, api/contracts/upload, api/contracts/[token]/sign

import { baseEmailTemplate, ctaButton, infoBox, p, muted, greyBox } from './base'

// ─── 28. Contract signing request (to tenant) ───────────────────────────────
// Used by: api/contracts/generate, api/contracts/upload

export function contractSigningHtml(params: {
  tenantName: string
  landlordName: string
  propertyAddress: string
  signUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Please sign your tenancy agreement — ${params.propertyAddress}`,
    subtitle: 'Tenancy Agreement',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p(`${params.landlordName} has prepared a tenancy agreement for:`)}
      ${infoBox(params.propertyAddress)}
      ${p('Please review the contract and sign it electronically by typing your full name.')}
      ${ctaButton('Review & sign', params.signUrl)}
      ${muted('If you have questions about the agreement, contact your landlord directly before signing.')}
    `,
  })
}

// ─── 29. Contract fully signed (to both parties) ────────────────────────────
// Used by: api/contracts/[token]/sign when BOTH_SIGNED

export function contractFullySignedLandlordHtml(params: {
  landlordName: string
  tenantName: string
  propertyAddress: string
  dashboardUrl: string
}): string {
  return baseEmailTemplate({
    previewText: `Tenancy agreement fully signed — ${params.propertyAddress}`,
    subtitle: 'Tenancy Agreement',
    content: `
      ${p(`Hi ${params.landlordName},`)}
      ${p('Your tenancy agreement has been signed by both parties.')}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <p style="color:#16a34a;font-size:14px;font-weight:600;margin:0;text-align:center;">Both parties have signed</p>
      `)}
      ${p(`<strong style="color:#1a1a1a;">Tenant:</strong> ${params.tenantName}`)}
      ${p('You can now proceed with the property inspection.')}
      ${ctaButton('View in dashboard', params.dashboardUrl)}
    `,
  })
}

export function contractFullySignedTenantHtml(params: {
  tenantName: string
  landlordName: string
  propertyAddress: string
}): string {
  return baseEmailTemplate({
    previewText: `Tenancy agreement fully signed — ${params.propertyAddress}`,
    subtitle: 'Tenancy Agreement',
    content: `
      ${p(`Hi ${params.tenantName},`)}
      ${p('Your tenancy agreement has been signed by both parties.')}
      ${infoBox(params.propertyAddress)}
      ${greyBox(`
        <p style="color:#16a34a;font-size:14px;font-weight:600;margin:0;text-align:center;">Both parties have signed</p>
      `)}
      ${p(`Your landlord, <strong style="color:#1a1a1a;">${params.landlordName}</strong>, will be in touch about move-in arrangements.`)}
      ${muted('Keep a copy of your signed tenancy agreement for your records.')}
    `,
  })
}
