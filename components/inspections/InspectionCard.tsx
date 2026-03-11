'use client'

import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/lib/ui'
import { InspectionTypeBadge } from './InspectionTypeBadge'
import { fmtDate } from '@/lib/utils'

interface InspectionCardProps {
  inspection: {
    id: string
    status: string
    inspectionType: 'MOVE_IN' | 'PERIODIC' | 'MOVE_OUT'
    inspectionNumber: number
    scheduledDate: string | null
    pdfUrl: string | null
    createdAt: string
  }
  propertyId: string
}

export function InspectionCard({ inspection, propertyId }: InspectionCardProps) {
  const router = useRouter()

  const label =
    inspection.inspectionType === 'PERIODIC'
      ? `Periodic inspection #${inspection.inspectionNumber}`
      : inspection.inspectionType === 'MOVE_OUT'
        ? 'Move-out inspection'
        : 'Move-in inspection'

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <InspectionTypeBadge type={inspection.inspectionType} />
        <StatusBadge status={inspection.status} />
        <span className="text-sm text-[#1A1A1A] font-medium truncate">{label}</span>
        {inspection.scheduledDate && (
          <span className="text-xs text-[#9CA3AF]">{fmtDate(inspection.scheduledDate)}</span>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        {inspection.pdfUrl && (
          <button
            onClick={() => window.open(`/api/inspections/${inspection.id}/pdf`, '_blank')}
            className="text-xs text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
          >
            PDF
          </button>
        )}
        <button
          onClick={() => router.push(`/dashboard/properties/${propertyId}/inspection?reportId=${inspection.id}`)}
          className="text-xs text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
        >
          {inspection.status === 'AGREED' ? 'View' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
