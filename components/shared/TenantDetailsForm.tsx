'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// ── Types ────────────────────────────────────────────────────────────────────

export type TenantFormData = {
  tenantName: string
  tenantEmail: string
  tenantPhone?: string
  monthlyRentStr: string
  paymentDay: number
  startDate: string
  depositAmountStr?: string
  depositScheme?: string
  depositRef?: string
}

const tenantSchema = z.object({
  tenantName: z.string().min(1, 'Tenant name is required'),
  tenantEmail: z.string().email('Enter a valid email'),
  tenantPhone: z.string().optional(),
  monthlyRentStr: z.string().min(1, 'Monthly rent is required'),
  paymentDay: z.number().int().min(1).max(31),
  startDate: z.string().min(1, 'Start date is required'),
  depositAmountStr: z.string().optional(),
  depositScheme: z.string().optional(),
  depositRef: z.string().optional(),
})

// ── Style maps ───────────────────────────────────────────────────────────────

const styles = {
  dark: {
    input:
      'w-full bg-[#5f655f] border border-white/15 rounded-lg px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors',
    label: 'block text-sm text-white/70 mb-1.5',
    optional: 'text-white/30',
    error: 'mt-1 text-xs text-red-400',
    hint: 'mt-1 text-xs text-white/30',
    button:
      'w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors',
  },
  light: {
    input:
      'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-[#1A1A1A] placeholder-[#9CA3AF] text-sm focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors',
    label: 'block text-sm text-[#374151] mb-1.5',
    optional: 'text-[#9CA3AF]',
    error: 'mt-1 text-xs text-red-500',
    hint: 'mt-1 text-xs text-[#9CA3AF]',
    button:
      'w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors',
  },
}

// ── Component ────────────────────────────────────────────────────────────────

interface TenantDetailsFormProps {
  onSubmit: (data: TenantFormData) => Promise<void>
  isLoading: boolean
  submitLabel?: string
  variant?: 'dark' | 'light'
}

export default function TenantDetailsForm({
  onSubmit,
  isLoading,
  submitLabel = 'Save',
  variant = 'light',
}: TenantDetailsFormProps) {
  const s = styles[variant]

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { paymentDay: 1 },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className={s.label}>Full name</label>
        <input {...register('tenantName')} placeholder="Jane Smith" className={s.input} />
        {errors.tenantName && <p className={s.error}>{errors.tenantName.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={s.label}>Email</label>
          <input type="email" {...register('tenantEmail')} placeholder="jane@example.com" className={s.input} />
          {errors.tenantEmail && <p className={s.error}>{errors.tenantEmail.message}</p>}
        </div>
        <div>
          <label className={s.label}>
            Phone <span className={s.optional}>(optional)</span>
          </label>
          <input type="tel" {...register('tenantPhone')} placeholder="07700 900000" className={s.input} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={s.label}>Monthly rent (£)</label>
          <input {...register('monthlyRentStr')} placeholder="1200" className={s.input} />
          {errors.monthlyRentStr && <p className={s.error}>{errors.monthlyRentStr.message}</p>}
        </div>
        <div>
          <label className={s.label}>Payment day</label>
          <input
            type="number"
            min={1}
            max={31}
            {...register('paymentDay', { valueAsNumber: true })}
            className={s.input}
          />
          {errors.paymentDay && <p className={s.error}>{errors.paymentDay.message}</p>}
        </div>
      </div>

      <div>
        <label className={s.label}>Tenancy start date</label>
        <input type="date" {...register('startDate')} className={s.input} />
        {errors.startDate && <p className={s.error}>{errors.startDate.message}</p>}
      </div>

      {/* Deposit fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={s.label}>
            Deposit amount (£) <span className={s.optional}>(optional)</span>
          </label>
          <input {...register('depositAmountStr')} placeholder="1200" className={s.input} />
        </div>
        <div>
          <label className={s.label}>
            Deposit scheme <span className={s.optional}>(optional)</span>
          </label>
          <input {...register('depositScheme')} placeholder="e.g. DPS, TDS, MyDeposits" className={s.input} />
        </div>
      </div>

      <div>
        <label className={s.label}>
          Deposit reference <span className={s.optional}>(optional)</span>
        </label>
        <input {...register('depositRef')} placeholder="Reference number" className={s.input} />
      </div>

      <div className="pt-2">
        <button type="submit" disabled={isLoading} className={s.button}>
          {isLoading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
