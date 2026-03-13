'use client'

import { createClient } from '@/lib/supabase/client'

export default function DemoBanner() {
  async function handleSignUp() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between">
      <span>
        You&apos;re exploring a demo — feel free to click around.
        Ready to manage your own properties?
      </span>
      <button onClick={handleSignUp} className="ml-4 whitespace-nowrap font-medium underline text-amber-900">
        Create your free account &rarr;
      </button>
    </div>
  )
}
