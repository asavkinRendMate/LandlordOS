'use client'

export type SectionHelpKey =
  | 'documents'
  | 'rooms'
  | 'inspection'
  | 'tenant'
  | 'rent'
  | 'maintenance'
  | 'applications'
  | 'more'

const SECTION_HELP: Record<SectionHelpKey, {
  title: string
  description: string
  example: string
  role: string
}> = {
  documents: {
    title: 'Property Documents',
    description: 'Store all compliance certificates and legal documents for this property in one place.',
    example: 'Upload your Gas Safety Certificate, EPC, and EICR before your tenancy begins.',
    role: 'LetSorted tracks expiry dates and alerts you 30 days before anything expires.',
  },
  rooms: {
    title: 'Rooms & Layout',
    description: 'Define the rooms in your property. This is used when creating inspection reports.',
    example: 'A 2-bed flat might have: Bedroom 1, Bedroom 2, Living Room, Kitchen, Bathroom, Hallway.',
    role: 'Rooms must be configured before you can create a inspection report. You can reorder and rename them.',
  },
  inspection: {
    title: 'Property Inspection',
    description: "A photographic record of the property's condition at the start of a tenancy.",
    example: 'Photograph each room, note any existing damage, then send to your tenant for review.',
    role: 'Protects both parties in deposit disputes. Both landlord and tenant confirm the report, then a PDF is generated and emailed to both.',
  },
  tenant: {
    title: 'Tenant',
    description: "Manage your current tenant's details, documents, and portal access.",
    example: 'Once you select a tenant from applicants, they appear here and get access to the tenant portal.',
    role: "Central hub for the active tenancy \u2014 documents, right to rent, onboarding checklist, and portal link.",
  },
  rent: {
    title: 'Rent Payments',
    description: 'Track monthly rent payments for this tenancy.',
    example: 'Mark payments as received, record partial payments, and see overdue alerts at a glance.',
    role: 'Builds a complete rent history for the tenancy. Required for any dispute evidence or reference.',
  },
  maintenance: {
    title: 'Maintenance',
    description: 'Log and track maintenance requests for this property.',
    example: "Your tenant reports a broken boiler via their portal \u2014 it appears here instantly.",
    role: "Creates an immutable audit trail. Damp and mould issues automatically trigger Awaab's Law 24-hour response timer.",
  },
  applications: {
    title: 'Applications',
    description: 'Invite prospective tenants to apply for this property and screen their finances with AI.',
    example: 'Enter up to 10 email addresses, toggle financial verification on, send invites \u2014 candidates upload bank statements and you get a scored report.',
    role: 'Full tenant pipeline from application to selection. Once you select a tenant, this section archives automatically.',
  },
  more: {
    title: 'Danger Zone',
    description: 'Deleting a property is permanent and cannot be undone. You will lose access to all historical data associated with this property.',
    example: 'The following data will be permanently deleted:\n\u2022 All screening reports and applicant data\n\u2022 All tenant records and documents\n\u2022 All maintenance requests\n\u2022 All rent payment records\n\u2022 All inspection reports and photos\n\u2022 All compliance documents',
    role: 'Consider exporting or downloading any important documents before deleting. This action is impossible to undo.',
  },
}

interface SectionHelpModalProps {
  isOpen: boolean
  onClose: () => void
  section: SectionHelpKey
}

export default function SectionHelpModal({ isOpen, onClose, section }: SectionHelpModalProps) {
  if (!isOpen) return null

  const help = SECTION_HELP[section]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-[#1A1A1A] font-semibold">{help.title}</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto space-y-4">
          <div>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-1">What is this?</p>
            <p className="text-sm text-[#1A1A1A] leading-relaxed">{help.description}</p>
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-1">Example</p>
            <p className="text-sm text-[#1A1A1A] leading-relaxed whitespace-pre-line">{help.example}</p>
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium mb-1">How it fits in</p>
            <p className="text-sm text-[#1A1A1A] leading-relaxed">{help.role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SectionHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:border-gray-300 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors"
    >
      i
    </button>
  )
}
