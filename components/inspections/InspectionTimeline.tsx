'use client'

import { InspectionCard } from './InspectionCard'
import { EmptyState } from '@/lib/ui'

interface Inspection {
  id: string
  status: string
  inspectionType: 'MOVE_IN' | 'PERIODIC' | 'MOVE_OUT'
  inspectionNumber: number
  scheduledDate: string | null
  pdfUrl: string | null
  createdAt: string
}

interface InspectionTimelineProps {
  inspections: Inspection[]
  propertyId: string
}

export function InspectionTimeline({ inspections, propertyId }: InspectionTimelineProps) {
  if (inspections.length === 0) {
    return <EmptyState message="No inspections yet" />
  }

  return (
    <div className="divide-y divide-gray-100">
      {inspections.map((inspection) => (
        <InspectionCard
          key={inspection.id}
          inspection={inspection}
          propertyId={propertyId}
        />
      ))}
    </div>
  )
}
