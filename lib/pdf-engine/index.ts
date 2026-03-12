/**
 * lib/pdf-engine/index.ts — Single public entry point.
 *
 * Usage:
 *   import { generatePDF } from '@/lib/pdf-engine'
 *   const result = await generatePDF({ template: '...', data: { ... } })
 */

import type { PDFRequest, PDFResult } from './types'
import { renderInspectionReport } from './templates/inspection-report'
import { renderScreeningReport } from './templates/screening-report'
import { renderAptContract } from './templates/apt-contract'
import { renderSection8Notice } from './templates/section-8-notice'
import { renderSection13Notice } from './templates/section-13-notice'
import { renderDisputePack } from './templates/dispute-pack'
import { renderCoverSheet } from './templates/cover-sheet'

export async function generatePDF(request: PDFRequest): Promise<PDFResult> {
  try {
    let result: { buffer: Buffer; pageCount: number }
    const today = new Date().toISOString().split('T')[0]

    switch (request.template) {
      case 'inspection-report':
        result = await renderInspectionReport(request.data)
        return { ...result, filename: `inspection-report-${today}.pdf` }

      case 'screening-report':
        result = await renderScreeningReport(request.data)
        return { ...result, filename: `screening-report-${today}.pdf` }

      case 'apt-contract':
        result = await renderAptContract(request.data)
        return { ...result, filename: `tenancy-agreement-${today}.pdf` }

      case 'section-8-notice':
        result = await renderSection8Notice(request.data)
        return { ...result, filename: `section-8-notice-${today}.pdf` }

      case 'section-13-notice':
        result = await renderSection13Notice(request.data)
        return { ...result, filename: `section-13-notice-${today}.pdf` }

      case 'dispute-pack':
        result = await renderDisputePack(request.data)
        return { ...result, filename: `dispute-evidence-pack-${today}.pdf` }

      case 'cover-sheet':
        result = await renderCoverSheet(request.data)
        return { ...result, filename: `cover-sheet-${request.data.referenceId}.pdf` }

      default: {
        const unknownReq = request as { template: string }
        throw {
          template: unknownReq.template,
          reason: `Unknown template: "${unknownReq.template}"`,
        }
      }
    }
  } catch (error) {
    // If already a typed error, re-throw
    const e = error as Record<string, unknown>
    if (e && e.template && e.reason) throw error
    // Wrap in typed error
    throw {
      template: request.template,
      reason: (e?.message as string) ?? 'Unknown error during PDF generation',
      originalError: error,
    }
  }
}

export type { PDFRequest, PDFResult } from './types'
