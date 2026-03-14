import { createServerClient } from '@/lib/supabase/server'

/**
 * Centralized Supabase Storage helpers.
 *
 * Rules:
 *  - NEVER store signed URLs in the database — store only storage paths.
 *  - ALWAYS generate a fresh signed URL at request time with getSignedUrl().
 *  - Signed URL expiry: 3600s (1 hour) — enough for a single session.
 */

const DEFAULT_BUCKET = 'documents'

/**
 * Generate a fresh signed URL for a storage path.
 * Always use this — never store signed URLs in DB.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const supabase = createServerClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

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
