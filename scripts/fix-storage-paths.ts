/**
 * One-time migration script: fix any DB records that accidentally stored
 * a signed URL instead of a storage path.
 *
 * Run after deploying: npx tsx scripts/fix-storage-paths.ts
 *
 * Checks all models with storage URL fields:
 *  - TenancyContract.pdfUrl
 *  - PropertyInspection.pdfUrl
 *  - InspectionPhoto.fileUrl
 *  - PropertyDocument.fileUrl
 *  - TenantDocument.fileUrl
 *  - MaintenancePhoto.fileUrl
 *
 * Safe to run multiple times — only updates records where the value
 * starts with 'https://'.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Extract the storage path from a Supabase signed URL.
 *
 * URL format:
 *   https://[project].supabase.co/storage/v1/object/sign/[bucket]/[path]?token=...
 *
 * Returns just the [path] portion.
 */
function extractPath(signedUrl: string, bucket: string): string | null {
  try {
    const url = new URL(signedUrl)
    const prefix = `/storage/v1/object/sign/${bucket}/`
    const idx = url.pathname.indexOf(prefix)
    if (idx === -1) return null
    return decodeURIComponent(url.pathname.slice(idx + prefix.length))
  } catch {
    return null
  }
}

interface FixConfig {
  label: string
  bucket: string
  field: 'pdfUrl' | 'fileUrl'
  findMany: () => Promise<Array<{ id: string; [key: string]: string | null }>>
  update: (id: string, path: string) => Promise<unknown>
}

async function main() {
  console.log('=== Storage Path Fix Script ===\n')

  const configs: FixConfig[] = [
    {
      label: 'TenancyContract.pdfUrl',
      bucket: 'documents',
      field: 'pdfUrl',
      findMany: () =>
        prisma.tenancyContract.findMany({
          where: { pdfUrl: { startsWith: 'https://' } },
          select: { id: true, pdfUrl: true },
        }),
      update: (id, path) =>
        prisma.tenancyContract.update({ where: { id }, data: { pdfUrl: path } }),
    },
    {
      label: 'PropertyInspection.pdfUrl',
      bucket: 'documents',
      field: 'pdfUrl',
      findMany: () =>
        prisma.propertyInspection.findMany({
          where: { pdfUrl: { startsWith: 'https://' } },
          select: { id: true, pdfUrl: true },
        }),
      update: (id, path) =>
        prisma.propertyInspection.update({ where: { id }, data: { pdfUrl: path } }),
    },
    {
      label: 'InspectionPhoto.fileUrl',
      bucket: 'check-in-photos',
      field: 'fileUrl',
      findMany: () =>
        prisma.inspectionPhoto.findMany({
          where: { fileUrl: { startsWith: 'https://' } },
          select: { id: true, fileUrl: true },
        }),
      update: (id, path) =>
        prisma.inspectionPhoto.update({ where: { id }, data: { fileUrl: path } }),
    },
    {
      label: 'PropertyDocument.fileUrl',
      bucket: 'documents',
      field: 'fileUrl',
      findMany: () =>
        prisma.propertyDocument.findMany({
          where: { fileUrl: { startsWith: 'https://' } },
          select: { id: true, fileUrl: true },
        }),
      update: (id, path) =>
        prisma.propertyDocument.update({ where: { id }, data: { fileUrl: path } }),
    },
    {
      label: 'TenantDocument.fileUrl',
      bucket: 'tenant-documents',
      field: 'fileUrl',
      findMany: () =>
        prisma.tenantDocument.findMany({
          where: { fileUrl: { startsWith: 'https://' } },
          select: { id: true, fileUrl: true },
        }),
      update: (id, path) =>
        prisma.tenantDocument.update({ where: { id }, data: { fileUrl: path } }),
    },
    {
      label: 'MaintenancePhoto.fileUrl',
      bucket: 'maintenance-photos',
      field: 'fileUrl',
      findMany: () =>
        prisma.maintenancePhoto.findMany({
          where: { fileUrl: { startsWith: 'https://' } },
          select: { id: true, fileUrl: true },
        }),
      update: (id, path) =>
        prisma.maintenancePhoto.update({ where: { id }, data: { fileUrl: path } }),
    },
  ]

  let totalFixed = 0

  for (const config of configs) {
    const records = await config.findMany()

    if (records.length === 0) {
      console.log(`  ${config.label}: OK (0 signed URLs found)`)
      continue
    }

    console.log(`  ${config.label}: ${records.length} record(s) with signed URLs`)

    for (const record of records) {
      const value = record[config.field] as string
      const path = extractPath(value, config.bucket)

      if (!path) {
        console.log(`    SKIP ${record.id} — could not extract path from URL`)
        continue
      }

      await config.update(record.id, path)
      console.log(`    FIXED ${record.id}: ${value.slice(0, 60)}... → ${path}`)
      totalFixed++
    }
  }

  console.log(`\nDone. Fixed ${totalFixed} record(s).`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
