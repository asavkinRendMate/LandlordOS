interface ScreeningCardProps {
  children: React.ReactNode
  className?: string
}

export default function ScreeningCard({ children, className = '' }: ScreeningCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-8 ${className}`}>
      {children}
    </div>
  )
}
