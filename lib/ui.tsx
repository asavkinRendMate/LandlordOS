'use client'

import { useEffect, useCallback } from 'react'
import Link from 'next/link'

// ── Card ────────────────────────────────────────────────────────────────────

/** Standard white card container. Never write this className inline. */
export const cardClass =
  'bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)] p-4'

// ── Spinner ─────────────────────────────────────────────────────────────────

const spinnerSizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-12 h-12' } as const
const spinnerColors = { green: 'border-[#16a34a]', white: 'border-white' } as const

interface SpinnerProps {
  size?: keyof typeof spinnerSizes
  color?: keyof typeof spinnerColors
}

export function Spinner({ size = 'md', color = 'green' }: SpinnerProps) {
  return (
    <div
      className={`${spinnerSizes[size]} border-2 ${spinnerColors[color]} border-t-transparent rounded-full animate-spin`}
    />
  )
}

// ── Modal ───────────────────────────────────────────────────────────────────

const modalSizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-2xl' } as const

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: keyof typeof modalSizes
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, size = 'md', children }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full ${modalSizes[size]} max-h-[90vh] flex flex-col overflow-hidden shadow-xl`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-[#1A1A1A] font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}

// ── StatusBadge ─────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  // green
  ACTIVE: 'bg-green-100 text-green-700',
  VACANT: 'bg-green-100 text-green-700',
  AGREED: 'bg-green-100 text-green-700',
  RECEIVED: 'bg-green-100 text-green-700',
  LIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  PROTECTED: 'bg-green-100 text-green-700',
  // blue
  PENDING: 'bg-blue-100 text-blue-700',
  INVITED: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  EXPECTED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  // red
  LATE: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-red-100 text-red-700',
  DISPUTED: 'bg-red-100 text-red-700',
  PAST_DUE: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-red-100 text-red-700',
  // gray
  DRAFT: 'bg-gray-100 text-gray-600',
  FORMER_TENANT: 'bg-gray-100 text-gray-600',
  CANCELED: 'bg-gray-100 text-gray-600',
  NONE: 'bg-gray-100 text-gray-600',
  // yellow
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  NOTICE_GIVEN: 'bg-yellow-100 text-yellow-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  MOCK_PAID: 'bg-yellow-100 text-yellow-700',
  LANDLORD_SIGNED: 'bg-yellow-100 text-yellow-700',
  TENANT_SIGNED: 'bg-yellow-100 text-yellow-700',
  // contract
  PENDING_SIGNATURES: 'bg-blue-100 text-blue-700',
  PENDING_GENERATION: 'bg-blue-100 text-blue-700',
  BOTH_SIGNED: 'bg-green-100 text-green-700',
  VOIDED: 'bg-gray-100 text-gray-600',
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface StatusBadgeProps {
  status: string
  label?: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const color = statusColors[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {label ?? formatStatus(status)}
    </span>
  )
}

// ── PriorityBadge ───────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-gray-100 text-gray-600',
}

interface PriorityBadgeProps {
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const color = priorityColors[priority] ?? 'bg-gray-100 text-gray-600'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {priority}
    </span>
  )
}

// ── EmptyState ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  message: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-[#9CA3AF] text-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-sm text-[#16a34a] hover:text-[#15803d] font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ── AlertBar ────────────────────────────────────────────────────────────────

const alertVariants = {
  warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  error: 'bg-red-50 text-red-800 border border-red-200',
  info: 'bg-blue-50 text-blue-800 border border-blue-200',
  success: 'bg-green-50 text-green-800 border border-green-200',
} as const

interface AlertBarProps {
  variant: keyof typeof alertVariants
  message: string
  action?: { label: string; onClick: () => void }
}

export function AlertBar({ variant, message, action }: AlertBarProps) {
  return (
    <div
      className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm ${alertVariants[variant]}`}
    >
      <p className="flex-1">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="shrink-0 font-medium underline underline-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ── TabFilter ───────────────────────────────────────────────────────────────

interface TabFilterProps {
  tabs: Array<{ key: string; label: string }>
  active: string
  onChange: (key: string) => void
}

export function TabFilter({ tabs, active, onChange }: TabFilterProps) {
  return (
    <div className="bg-gray-100 rounded-lg p-1 flex gap-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 text-sm rounded-md transition-all ${
            tab.key === active
              ? 'bg-white text-[#1A1A1A] font-medium shadow-sm'
              : 'text-[#9CA3AF] hover:text-[#6B7280]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── ListRow ─────────────────────────────────────────────────────────────────

interface ListRowProps {
  href?: string
  onClick?: () => void
  badge?: React.ReactNode
  title: string
  meta?: string
  rightContent?: React.ReactNode
}

export function ListRow({ href, onClick, badge, title, meta, rightContent }: ListRowProps) {
  const inner = (
    <>
      {badge && <div className="shrink-0">{badge}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[#1A1A1A] text-sm font-medium truncate">{title}</p>
        {meta && <p className="text-[#9CA3AF] text-xs truncate">{meta}</p>}
      </div>
      {rightContent && <div className="shrink-0">{rightContent}</div>}
      {href && (
        <svg
          className="w-4 h-4 text-[#D1D5DB] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </>
  )

  const className =
    'flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0'

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    )
  }

  return (
    <div onClick={onClick} className={`${className}${onClick ? ' cursor-pointer' : ''}`}>
      {inner}
    </div>
  )
}

// ── PageHeader ──────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export function PageHeader({ title, action }: PageHeaderProps) {
  const btnClass =
    'text-sm font-medium text-white bg-[#16a34a] hover:bg-[#15803d] px-4 py-2 rounded-lg transition-colors'

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold text-[#1A1A1A]">{title}</h1>
      {action &&
        (action.href ? (
          <Link href={action.href} className={btnClass}>
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick} className={btnClass}>
            {action.label}
          </button>
        ))}
    </div>
  )
}
