'use client'

const typeConfig: Record<string, { label: string; bg: string; text: string }> = {
  MOVE_IN: { label: 'Move-in', bg: 'bg-blue-100', text: 'text-blue-700' },
  PERIODIC: { label: 'Periodic', bg: 'bg-purple-100', text: 'text-purple-700' },
  MOVE_OUT: { label: 'Move-out', bg: 'bg-orange-100', text: 'text-orange-700' },
}

interface InspectionTypeBadgeProps {
  type: 'MOVE_IN' | 'PERIODIC' | 'MOVE_OUT'
}

export function InspectionTypeBadge({ type }: InspectionTypeBadgeProps) {
  const config = typeConfig[type] ?? typeConfig.MOVE_IN
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  )
}
