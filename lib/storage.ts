import { createServerClient } from '@/lib/supabase/server'

const DEFAULT_BUCKET = 'documents'

async function ensureBucket(bucket: string) {
  const supabase = createServerClient()
  const { error } = await supabase.storage.getBucket(bucket)
  if (error) {
    await supabase.storage.createBucket(bucket, { public: false })
  }
}

export async function uploadFile(path: string, file: File, bucket = DEFAULT_BUCKET): Promise<string> {
  await ensureBucket(bucket)
  const supabase = createServerClient()
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}

export async function getSignedUrl(path: string, expiresIn = 3600, bucket = DEFAULT_BUCKET): Promise<string> {
  const supabase = createServerClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data) throw new Error(`Failed to create signed URL: ${error?.message}`)
  return data.signedUrl
}

export async function deleteFile(path: string, bucket = DEFAULT_BUCKET): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
