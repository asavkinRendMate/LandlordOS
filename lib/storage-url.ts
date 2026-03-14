import { createServerClient } from '@/lib/supabase/server'

/**
 * Centralized Supabase Storage helpers.
 *
 * Rules:
 *  - NEVER store signed URLs in the database — store only storage paths.
 *  - ALWAYS generate a fresh signed URL at request time with getSignedUrl().
 *  - Signed URL expiry: 86400s (24 hours) by default.
 */

const DEFAULT_BUCKET = 'documents'

/**
 * Extract a storage path from a value that might be a full Supabase URL.
 * If the value is already a plain path, returns it unchanged.
 */
function extractStoragePath(bucket: string, value: string): string {
  if (!value.startsWith('https://')) return value

  // Signed URL pattern: /object/sign/<bucket>/<path>?token=...
  const signedMatch = value.match(
    new RegExp(`/object/sign/${bucket}/(.+?)\\?`),
  )
  if (signedMatch) return decodeURIComponent(signedMatch[1])

  // Public URL pattern: /object/public/<bucket>/<path>
  const publicMatch = value.match(
    new RegExp(`/object/public/${bucket}/(.+?)(?:\\?|$)`),
  )
  if (publicMatch) return decodeURIComponent(publicMatch[1])

  // Fallback — return as-is and let createSignedUrl surface the error
  return value
}

/**
 * Generate a fresh signed URL for a storage path.
 * Always use this — never store signed URLs in DB.
 *
 * Defensively extracts the storage path if a full URL was
 * accidentally stored in the database.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 86400,
): Promise<string> {
  const storagePath = extractStoragePath(bucket, path)
  const supabase = createServerClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`)
  }

  return data.signedUrl
}

/**
 * Upload a file buffer and return the storage PATH (not signed URL).
 */
export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType = 'application/pdf',
): Promise<string> {
  const supabase = createServerClient()

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { upsert: true, contentType })

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  return path // return PATH, not URL
}

/**
 * Ensure a storage bucket exists (create if missing).
 */
export async function ensureBucket(bucket = DEFAULT_BUCKET): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.storage.getBucket(bucket)
  if (error) {
    await supabase.storage.createBucket(bucket, { public: false })
  }
}
