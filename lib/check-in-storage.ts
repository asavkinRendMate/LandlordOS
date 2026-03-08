import { createServerClient } from '@/lib/supabase/server'

const BUCKET = 'check-in-photos'

async function ensureBucket() {
  const supabase = createServerClient()
  const { error } = await supabase.storage.getBucket(BUCKET)
  if (error) {
    await supabase.storage.createBucket(BUCKET, { public: false })
  }
}

/**
 * Upload a check-in photo.
 * Storage path: /{propertyId}/{reportId}/{roomId}/{photoId}-{fileName}
 * Returns the storage path (used as fileUrl in DB).
 */
export async function uploadCheckInPhoto(
  propertyId: string,
  reportId: string,
  roomId: string,
  photoId: string,
  file: File,
): Promise<string> {
  await ensureBucket()
  const supabase = createServerClient()

  const storagePath = `${propertyId}/${reportId}/${roomId}/${photoId}-${file.name}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(`Check-in photo upload failed: ${error.message}`)
  return storagePath
}

/**
 * Generate a signed URL for a check-in photo (60 min expiry).
 */
export async function getCheckInPhotoUrl(
  fileUrl: string,
  expiresIn = 3600,
): Promise<string> {
  const supabase = createServerClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(fileUrl, expiresIn)
  if (error || !data) throw new Error(`Failed to sign check-in photo URL: ${error?.message}`)
  return data.signedUrl
}

/**
 * Delete a check-in photo from storage.
 */
export async function deleteCheckInPhoto(fileUrl: string): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.storage.from(BUCKET).remove([fileUrl])
  if (error) throw new Error(`Failed to delete check-in photo: ${error.message}`)
}
