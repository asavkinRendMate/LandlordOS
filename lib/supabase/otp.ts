/**
 * Send OTP via Supabase REST API directly — bypasses PKCE.
 *
 * @supabase/ssr forces flowType:'pkce' on every client. This makes
 * signInWithOtp() attach a PKCE code_challenge to the OTP request,
 * but verifyOtp() never sends the corresponding code_verifier back,
 * so the server rejects valid codes with "Token has expired or is invalid".
 *
 * Calling the /auth/v1/otp endpoint directly (without code_challenge)
 * avoids this — verifyOtp() then works because the server has no
 * PKCE challenge to validate against.
 *
 * Works on both client and server (uses env vars available to both).
 */
export async function sendOtpDirect(
  email: string
): Promise<{ error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return { error: 'Supabase configuration missing' }
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      email,
      create_user: true,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return {
      error: body.msg || body.error_description || 'Failed to send code',
    }
  }

  return { error: null }
}
