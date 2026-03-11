/**
 * lib/pdf-engine/types.ts
 *
 * PUBLIC CONTRACT — PDF Engine boundary.
 *
 * Rules:
 * - Only primitives: string, number, boolean, arrays, plain objects
 * - No Date objects — use ISO 8601 strings (YYYY-MM-DD or full datetime)
 * - No Prisma types, no enums imported from elsewhere
 * - No optional fields that are structurally required — be explicit
 * - Monetary values in PENCE (integers), never floats
 *
 * Adding fields: OK to add optional fields to existing types (backward compatible)
 * Adding templates: OK to add new discriminated union members
 * NEVER remove or rename existing fields — callers will break silently
 */

// ─────────────────────────────────────────────
// Shared config (passed per-request)
// ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- reserved for future config options
export type PDFConfig = {}

// ─────────────────────────────────────────────
// Top-level dispatcher
// ─────────────────────────────────────────────

export type PDFRequest =
  | { template: 'screening-report';  data: ScreeningReportData;  config?: PDFConfig }
  | { template: 'inspection-report';  data: InspectionReportData;  config?: PDFConfig }
  | { template: 'apt-contract';      data: AptContractData;      config?: PDFConfig }
  | { template: 'section-8-notice';  data: Section8NoticeData;   config?: PDFConfig }
  | { template: 'section-13-notice'; data: Section13NoticeData;  config?: PDFConfig }
  | { template: 'dispute-pack';      data: DisputePackData;      config?: PDFConfig }
  | { template: 'cover-sheet';       data: CoverSheetData;       config?: PDFConfig }

export type PDFResult = {
  /** Raw PDF bytes — caller writes to storage */
  buffer: Buffer
  /** Suggested filename, e.g. "screening-report-2026-03-11.pdf" */
  filename: string
  pageCount: number
}

// ─────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────

export type PDFPhoto = {
  /** Fully resolved URL (signed or public). Engine will fetch and embed. */
  url: string
  caption?: string
  /** ISO datetime string */
  takenAt: string
  uploadedBy: 'landlord' | 'tenant'
}

export type PDFAddress = {
  line1: string
  line2?: string
  town: string
  county?: string
  postcode: string
  country?: string
}

export type PDFParty = {
  fullName: string
  email: string
  phone?: string
  address?: PDFAddress
}

export type PDFSignatureBlock = {
  party: PDFParty
  /** ISO datetime — if present, renders "Signed on [date]" */
  signedAt?: string
  /** Base64 PNG of signature image — if present, renders image */
  signatureImageBase64?: string
}

// ─────────────────────────────────────────────
// 1. Screening Report
// ─────────────────────────────────────────────

export type ScreeningReportCategory = {
  name: string
  score: number        // 0–100
  maxScore: number     // weight ceiling
  summary: string      // 1–3 sentences, already cleaned (no chain-of-thought)
  flags: Array<{
    rule: string       // e.g. "RENT_ABOVE_40_PCT"
    severity: 'INFO' | 'WARNING' | 'FAIL'
    detail: string
  }>
}

export type ScreeningApplicant = {
  fullName: string
  email: string
  /** ISO date string */
  statementPeriodStart: string
  statementPeriodEnd: string
  nameVerified: boolean
  /** Monthly average net income in pence */
  averageMonthlyIncomePence: number
  /** Monthly average outgoings in pence */
  averageMonthlyOutgoingsPence: number
}

export type ScreeningReportData = {
  reportId: string
  /** ISO date of report generation */
  generatedAt: string
  propertyAddress: string
  /** Monthly rent in pence */
  monthlyRentPence: number
  isJointApplication: boolean
  applicants: ScreeningApplicant[]             // 1 or 2
  totalScore: number                           // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  categories: ScreeningReportCategory[]
  /** Overall summary paragraph — already cleaned */
  overallSummary: string
  /** Public verification URL, e.g. https://letsorted.co.uk/verify/[token] */
  verificationUrl: string
  /** Name of landlord/agent who unlocked */
  unlockedBy: string
}

// ─────────────────────────────────────────────
// 2. Property Inspection
// ─────────────────────────────────────────────

export type InspectionRoomCondition = 'GOOD' | 'FAIR' | 'POOR'

export type InspectionRoom = {
  name: string                    // e.g. "Master Bedroom", "Kitchen"
  floor?: string                  // e.g. "Ground floor"
  condition: InspectionRoomCondition
  landlordNotes?: string
  tenantNotes?: string
  photos: PDFPhoto[]              // mixed landlord + tenant, engine renders attributed
}

export type InspectionReportData = {
  reportId: string
  propertyAddress: PDFAddress
  /** ISO date of tenancy start */
  tenancyStartDate: string
  landlord: PDFParty
  tenant: PDFParty
  rooms: InspectionRoom[]
  landlordConfirmedAt: string     // ISO datetime
  tenantConfirmedAt?: string      // ISO datetime — absent if DISPUTED
  status: 'AGREED' | 'DISPUTED'
  /** If DISPUTED — tenant's dispute reason */
  disputeReason?: string
  /** ISO date of PDF generation */
  generatedAt: string
}

// ─────────────────────────────────────────────
// 3. APT Contract (Assured Periodic Tenancy)
// ─────────────────────────────────────────────

export type AptClause = {
  heading: string
  body: string    // plain text, may contain \n for paragraph breaks
}

export type AptContractData = {
  contractId: string
  /** ISO date of contract creation */
  createdAt: string
  /** ISO date tenancy commences */
  tenancyStartDate: string
  /** Monthly rent in pence */
  monthlyRentPence: number
  /** Day of month rent is due, 1–28 */
  rentDueDay: number
  /** Deposit in pence */
  depositPence: number
  /** Deposit protection scheme name — absent if not yet confirmed */
  depositScheme?: string
  /** Deposit protection reference number — absent if not yet confirmed */
  depositReference?: string
  property: PDFAddress
  landlord: PDFSignatureBlock
  /** Up to 4 tenants */
  tenants: PDFSignatureBlock[]
  /** Pre-approved clauses — ordered list */
  clauses: AptClause[]
  /** Any pre-tenancy special conditions agreed */
  specialConditions?: string
  /** Permitted occupiers (not tenants) */
  permittedOccupiers?: string[]
  /** e.g. "Cats and dogs permitted" */
  petClause?: string
}

// ─────────────────────────────────────────────
// 4. Section 8 Notice
// ─────────────────────────────────────────────

/** Statutory grounds under Housing Act 1988 as amended by RRA 2025 */
export type Section8Ground =
  | 'GROUND_1'    // Landlord wishes to return
  | 'GROUND_2'    // Mortgage lender repossession
  | 'GROUND_7A'   // Antisocial behaviour (mandatory)
  | 'GROUND_8'    // 2+ months rent arrears (mandatory)
  | 'GROUND_10'   // Some rent arrears (discretionary)
  | 'GROUND_11'   // Persistent late payment (discretionary)
  | 'GROUND_14'   // Nuisance / annoyance (discretionary)

export type Section8NoticeData = {
  noticeId: string
  /** ISO date notice is served */
  servedAt: string
  /** ISO date possession proceedings may begin (servedAt + notice period) */
  possessionAfter: string
  property: PDFAddress
  landlord: PDFParty
  /** All tenants must be named */
  tenants: PDFParty[]
  grounds: Section8Ground[]
  /** Free-text evidence statement per ground — keyed by ground */
  groundEvidence: Partial<Record<Section8Ground, string>>
  /** Rent arrears amount in pence — required if GROUND_8/10/11 */
  arrearsAmountPence?: number
  /** ISO date arrears calculated to */
  arrearsCalculatedTo?: string
  landlordSignature: PDFSignatureBlock
}

// ─────────────────────────────────────────────
// 5. Section 13 Notice (Rent Increase)
// ─────────────────────────────────────────────

export type Section13NoticeData = {
  noticeId: string
  /** ISO date notice is served */
  servedAt: string
  /** ISO date new rent takes effect (servedAt + 2 months minimum) */
  effectiveDate: string
  property: PDFAddress
  landlord: PDFParty
  tenants: PDFParty[]
  /** Current monthly rent in pence */
  currentRentPence: number
  /** Proposed new monthly rent in pence */
  proposedRentPence: number
  /** ISO date of last rent increase — to prove 12-month gap */
  lastIncreaseDate?: string
  landlordSignature: PDFSignatureBlock
}

// ─────────────────────────────────────────────
// 6. Dispute Evidence Pack
// ─────────────────────────────────────────────

export type DisputeTicket = {
  id: string
  /** ISO datetime */
  submittedAt: string
  category: string        // e.g. "Damp & Mould", "Heating"
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  description: string
  /** ISO datetime */
  resolvedAt?: string
  resolutionNotes?: string
  photos: PDFPhoto[]
}

export type DisputeRentRecord = {
  /** ISO date (due date) */
  dueDate: string
  amountDuePence: number
  amountPaidPence: number
  status: 'RECEIVED' | 'LATE' | 'PARTIAL' | 'PENDING'
  /** ISO datetime */
  paidAt?: string
}

export type DisputeDocument = {
  name: string
  type: string            // e.g. "Gas Safety Certificate", "Check-In Report"
  /** ISO date */
  uploadedAt: string
  /** Signed URL — engine will note "on file" but not embed full doc */
  url?: string
}

export type DisputeEvent = {
  /** ISO datetime */
  occurredAt: string
  actor: 'landlord' | 'tenant' | 'system'
  description: string
}

export type DisputePackData = {
  packId: string
  /** ISO date of pack generation */
  generatedAt: string
  property: PDFAddress
  landlord: PDFParty
  tenant: PDFParty
  /** ISO date tenancy started */
  tenancyStartDate: string
  /** ISO date tenancy ended — if ended */
  tenancyEndDate?: string
  /** Deposit in pence */
  depositPence: number
  depositScheme: string
  depositReference: string
  maintenanceTickets: DisputeTicket[]
  rentHistory: DisputeRentRecord[]
  documents: DisputeDocument[]
  eventLog: DisputeEvent[]
  /** Inspection report photos for comparison */
  inspectionPhotos?: PDFPhoto[]
  /** Check-out inspection photos for comparison */
  checkOutPhotos?: PDFPhoto[]
  /** Free-text summary of dispute — written by landlord */
  disputeSummary: string
  /** Which body this pack is addressed to */
  addressedTo: 'deposit_scheme' | 'tribunal' | 'ombudsman' | 'court'
}

// ─────────────────────────────────────────────
// 7. Cover Sheet (prepended to uploaded contract)
// ─────────────────────────────────────────────

export type CoverSheetDocument = {
  /** Sequential number: 1, 2, 3... */
  index: number
  title: string
  /** Additional description line */
  description?: string
  /** 'uploaded' = provided by landlord | 'generated' = by LetSorted | 'pending' = not yet created */
  status: 'uploaded' | 'generated' | 'pending'
}

export type CoverSheetAcknowledgment = {
  party: 'landlord' | 'tenant'
  fullName: string
  /** ISO datetime of acknowledgment click */
  acknowledgedAt: string
  /** IPv4 or IPv6 */
  ipAddress: string
  /** User agent string — truncated to 120 chars */
  userAgent?: string
}

export type CoverSheetData = {
  /** Unique LetSorted reference, e.g. "LS-2026-A3F9K" */
  referenceId: string
  /** ISO datetime this cover sheet was generated */
  generatedAt: string
  propertyAddress: PDFAddress
  landlord: PDFParty
  /** All tenants — usually 1, up to 4 */
  tenants: PDFParty[]
  /** ISO date tenancy commences */
  tenancyStartDate: string
  /** Ordered list of documents in this pack */
  documents: CoverSheetDocument[]
  /** Acknowledgments recorded so far — may be 0, 1, or 2 at time of generation */
  acknowledgments: CoverSheetAcknowledgment[]
  /**
   * Legal statement rendered verbatim in the pack.
   * Caller provides this — do not generate legal text in the engine.
   * Example: "The parties confirm that the Property Inventory and Schedule of
   * Condition (Document 2) forms part of this tenancy agreement and is
   * incorporated herein by mutual confirmation upon completion."
   */
  incorporationStatement: string
}
