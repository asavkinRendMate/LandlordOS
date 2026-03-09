// Single source of truth for all LetSorted email notifications.
// Every new notification MUST be registered here.
// Admin panel: /admin/notifications
// Updated: 2026-03-09 — notifications registry

export type NotificationTrigger = 'event' | 'cron' | 'event+cron'
export type NotificationRecipient = 'landlord' | 'tenant' | 'both'
export type NotificationStatus = 'live' | 'not_started' | 'coming_soon'

export type NotificationDefinition = {
  id: string
  name: string
  description: string
  trigger: NotificationTrigger
  recipient: NotificationRecipient
  status: NotificationStatus
  templateFn?: string
}

export const NOTIFICATIONS: Record<string, NotificationDefinition> = {
  // ── Event-triggered — Landlord ──────────────────────────────────────────────

  LANDLORD_WELCOME: {
    id: 'LANDLORD_WELCOME',
    name: 'Landlord welcome',
    description: 'Sent to landlord on first sign up',
    trigger: 'event',
    recipient: 'landlord',
    status: 'live',
  },

  NEW_APPLICATION: {
    id: 'NEW_APPLICATION',
    name: 'New application',
    description: 'Sent to landlord when candidate submits public application form',
    trigger: 'event',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'newApplicationHtml',
  },

  SCREENING_COMPLETE: {
    id: 'SCREENING_COMPLETE',
    name: 'Screening complete',
    description: 'Sent to landlord when candidate finishes financial screening',
    trigger: 'event',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'landlordNotificationHtml',
  },

  CHECK_IN_TENANT_RESPONSE: {
    id: 'CHECK_IN_TENANT_RESPONSE',
    name: 'Check-in tenant response',
    description: 'Sent to landlord when tenant confirms or disputes check-in report',
    trigger: 'event',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'checkInTenantResponseHtml',
  },

  MAINTENANCE_NEW_REQUEST: {
    id: 'MAINTENANCE_NEW_REQUEST',
    name: 'Maintenance new request',
    description: 'Sent to landlord when tenant submits a maintenance request',
    trigger: 'event',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'maintenanceNewRequestHtml',
  },

  MAINTENANCE_STATUS_UPDATE_LANDLORD: {
    id: 'MAINTENANCE_STATUS_UPDATE_LANDLORD',
    name: 'Maintenance status update (landlord)',
    description: 'Sent to landlord when maintenance request status changes',
    trigger: 'event',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'maintenanceStatusUpdateLandlordHtml',
  },

  AWAABS_LAW_TIMER_EXPIRING: {
    id: 'AWAABS_LAW_TIMER_EXPIRING',
    name: "Awaab's Law timer expiring",
    description: 'Sent to landlord when 24h damp/mould response timer is about to expire',
    trigger: 'event+cron',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'awaabsLawExpiringHtml',
  },

  DD_PAYMENT_FAILED: {
    id: 'DD_PAYMENT_FAILED',
    name: 'DD payment failed',
    description: 'Sent to landlord when GoCardless Direct Debit collection fails',
    trigger: 'event',
    recipient: 'landlord',
    status: 'coming_soon',
  },

  // ── Event-triggered — Tenant ────────────────────────────────────────────────

  APPLICATION_RECEIVED: {
    id: 'APPLICATION_RECEIVED',
    name: 'Application received',
    description: 'Sent to tenant confirming their application was received',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'applicationReceivedHtml',
  },

  SCREENING_INVITE: {
    id: 'SCREENING_INVITE',
    name: 'Screening invite',
    description: 'Sent to candidate inviting them to complete financial screening',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'candidateInviteHtml',
  },

  TENANT_PORTAL_INVITE: {
    id: 'TENANT_PORTAL_INVITE',
    name: 'Tenant portal invite',
    description: 'Sent to tenant with link to join property portal',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'tenantInviteHtml',
  },

  APPLICATION_LINK: {
    id: 'APPLICATION_LINK',
    name: 'Application link',
    description: 'Sent to prospect with link to apply for a property',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'applicationLinkHtml',
  },

  TENANT_SELECTED: {
    id: 'TENANT_SELECTED',
    name: 'Tenant selected',
    description: 'Sent to successful applicant when landlord selects them as tenant',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'tenantSelectedHtml',
  },

  APPLICANT_REJECTED: {
    id: 'APPLICANT_REJECTED',
    name: 'Applicant rejected',
    description: 'Sent to unsuccessful applicants when landlord selects a different tenant',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'applicantRejectedHtml',
  },

  CHECK_IN_REVIEW: {
    id: 'CHECK_IN_REVIEW',
    name: 'Check-in review',
    description: 'Sent to tenant asking them to review and confirm check-in report',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'checkInReviewHtml',
  },

  CHECK_IN_PDF_READY: {
    id: 'CHECK_IN_PDF_READY',
    name: 'Check-in PDF ready',
    description: 'Sent to tenant with download link for signed check-in report PDF',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'checkInCompleteHtml',
  },

  MAINTENANCE_TENANT_CONFIRMATION: {
    id: 'MAINTENANCE_TENANT_CONFIRMATION',
    name: 'Maintenance tenant confirmation',
    description: 'Sent to tenant confirming maintenance request was received',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'maintenanceTenantConfirmationHtml',
  },

  MAINTENANCE_STATUS_UPDATE: {
    id: 'MAINTENANCE_STATUS_UPDATE',
    name: 'Maintenance status update',
    description: 'Sent to tenant when landlord updates status of their maintenance request',
    trigger: 'event',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'maintenanceStatusUpdateTenantHtml',
  },

  DD_COLLECTION_UPCOMING: {
    id: 'DD_COLLECTION_UPCOMING',
    name: 'DD collection upcoming',
    description: 'Sent to tenant 3 days before GoCardless collects rent',
    trigger: 'event',
    recipient: 'tenant',
    status: 'coming_soon',
  },

  DD_COLLECTION_SUCCESS: {
    id: 'DD_COLLECTION_SUCCESS',
    name: 'DD collection success',
    description: 'Sent to tenant confirming successful rent collection',
    trigger: 'event',
    recipient: 'tenant',
    status: 'coming_soon',
  },

  DD_COLLECTION_FAILED: {
    id: 'DD_COLLECTION_FAILED',
    name: 'DD collection failed',
    description: 'Sent to tenant when DD collection fails',
    trigger: 'event',
    recipient: 'tenant',
    status: 'coming_soon',
  },

  // ── Cron-triggered — Landlord ───────────────────────────────────────────────

  COMPLIANCE_EXPIRY_30D: {
    id: 'COMPLIANCE_EXPIRY_30D',
    name: 'Compliance expiry 30d',
    description: 'Sent to landlord when a compliance document expires in 30 days',
    trigger: 'cron',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'complianceExpiry30dHtml',
  },

  COMPLIANCE_EXPIRY_7D: {
    id: 'COMPLIANCE_EXPIRY_7D',
    name: 'Compliance expiry 7d',
    description: 'Sent to landlord when a compliance document expires in 7 days',
    trigger: 'cron',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'complianceExpiry7dHtml',
  },

  COMPLIANCE_EXPIRED: {
    id: 'COMPLIANCE_EXPIRED',
    name: 'Compliance expired',
    description: 'Sent to landlord when a compliance document has expired',
    trigger: 'cron',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'complianceExpiredHtml',
  },

  DEPOSIT_UNPROTECTED_WARNING: {
    id: 'DEPOSIT_UNPROTECTED_WARNING',
    name: 'Deposit unprotected warning',
    description: 'Sent to landlord when deposit is unprotected and 30-day deadline is approaching',
    trigger: 'cron',
    recipient: 'landlord',
    status: 'live',
    templateFn: 'depositUnprotectedWarningHtml',
  },

  // ── Cron-triggered — Tenant ─────────────────────────────────────────────────

  RENT_DUE_REMINDER_5D: {
    id: 'RENT_DUE_REMINDER_5D',
    name: 'Rent due reminder 5d',
    description: 'Sent to tenant 5 days before manual rent payment is due',
    trigger: 'cron',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'rentDueReminder5dHtml',
  },

  RENT_DUE_REMINDER_TODAY: {
    id: 'RENT_DUE_REMINDER_TODAY',
    name: 'Rent due reminder today',
    description: 'Sent to tenant on the day rent is due',
    trigger: 'cron',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'rentDueTodayHtml',
  },

  RENT_OVERDUE: {
    id: 'RENT_OVERDUE',
    name: 'Rent overdue',
    description: 'Sent to tenant when rent payment is overdue (daily, max 7 days)',
    trigger: 'cron',
    recipient: 'tenant',
    status: 'live',
    templateFn: 'rentOverdueHtml',
  },
}

export const NOTIFICATION_LIST = Object.values(NOTIFICATIONS)

export const getLiveNotifications = () =>
  NOTIFICATION_LIST.filter((n) => n.status === 'live')

export const getNotificationsByTrigger = (t: NotificationTrigger) =>
  NOTIFICATION_LIST.filter((n) => n.trigger === t)
