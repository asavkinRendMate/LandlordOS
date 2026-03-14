'use client'

interface SegmentedControlOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
}

export default function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex w-full bg-gray-100 rounded-xl p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out ${
            opt.value === value
              ? 'bg-white text-[#1A1A1A] shadow-sm'
              : 'text-[#9CA3AF] hover:text-[#6B7280]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
