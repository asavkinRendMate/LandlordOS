import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format ISO date string → "11 Mar 2026" */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Format ISO date string → "11/03/2026" */
export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB')
}

/** Format pence integer → "£1,200.00" */
export function fmtCurrency(pence: number): string {
  return `£${(pence / 100).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
