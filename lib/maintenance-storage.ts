import { createServerClient } from '@/lib/supabase/server'

const BUCKET = 'maintenance-photos'

async function ensureBucket() {
  const supabase = createServerClient()
  const { error } = await supabase.storage.getBucket(BUCKET)
  if (error) {
    await supabase.storage.createBucket(BUCKET, { public: false })
  }
}

/**
 * Upload a maintenance photo.
 * Storage path: /{requestId}/{role}/{photoId}-{fileName}
 * Returns the storage path (used as fileUrl in DB).
 */
export async function uploadMaintenancePhoto(
  requestId: string,
  role: string,
  photoId: string,
  file: File,
): Promise<string> {
  await ensureBucket()
  const supabase = createServerClient()

  const storagePath = `${requestId}/${role}/${photoId}-${file.name}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(`Maintenance photo upload failed: ${error.message}`)
  return storagePath
}

/**
 * Generate a signed URL for a maintenance photo (60 min expiry).
 */
export async function getMaintenancePhotoUrl(
  fileUrl: string,
  expiresIn = 3600,
): Promise<string> {
  const supabase = createServerClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(fileUrl, expiresIn)
  if (error || !data) throw new Error(`Failed to sign maintenance photo URL: ${error?.message}`)
  return data.signedUrl
}

/**
 * Delete a maintenance photo from storage.
 */
export async function deleteMaintenancePhoto(fileUrl: string): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.storage.from(BUCKET).remove([fileUrl])
  if (error) throw new Error(`Failed to delete maintenance photo: ${error.message}`)
}
