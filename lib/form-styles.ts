/** Shared form field styles — use these instead of defining per-page constants. */

/** Base styles without width — callers add w-full, w-36 etc. as needed. */
const baseInput =
  'bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors'

const baseSelect =
  'bg-white border border-gray-200 rounded-lg px-3.5 pr-10 py-2.5 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]/20 transition-colors appearance-none select-chevron'

/** Full-width input — most common usage. */
export const inputClass = `w-full ${baseInput} placeholder-gray-400`

/** Full-width select with chevron — most common usage. */
export const selectClass = `w-full ${baseSelect}`

/** Fixed-width select for constrained layouts (e.g. room type in a flex row). */
export const selectClassCompact = `w-36 shrink-0 ${baseSelect}`
