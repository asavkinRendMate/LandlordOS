'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useDemoLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startDemo = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/demo/create', { method: 'POST' })
      const json = await res.json()

      if (!res.ok || !json.data) {
        setError('Demo unavailable — please try again')
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: json.data.email,
        password: json.data.password,
      })

      if (signInError) {
        console.error('[demo] sign-in error:', signInError.message)
        setError('Demo unavailable — please try again')
        setLoading(false)
        return
      }

      // Keep loading state so spinner stays visible until navigation completes
      window.location.href = '/dashboard'
    } catch {
      setError('Demo unavailable — please try again')
      setLoading(false)
    }
  }

  return { startDemo, loading, error }
}
