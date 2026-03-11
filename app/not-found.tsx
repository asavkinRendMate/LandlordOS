'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NotFound() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
      setChecked(true)
    })
  }, [])

  function openCrisp() {
    if (typeof window !== 'undefined' && window.$crisp) {
      window.$crisp.push(['do', 'chat:open'])
    }
  }

  return (
    <div className="h-dvh bg-[#F7F8F6] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-12">
        <Image src="/logo.svg" alt="LetSorted" width={160} height={53} priority />
      </div>

      {/* House icon + 404 */}
      <div className="flex items-center gap-3 mb-4">
        <Home className="w-10 h-10 text-[#16a34a]" strokeWidth={1.5} />
        <span className="text-7xl sm:text-8xl font-extrabold text-[#16a34a] tracking-tight">
          404
        </span>
      </div>

      {/* Copy */}
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 text-center">
        This page doesn&apos;t exist
      </h1>
      <p className="text-gray-500 text-sm sm:text-base text-center max-w-sm mb-8">
        Looks like this property has gone off the market.
      </p>

      {/* Smart CTA */}
      {checked && (
        <div className="flex flex-col items-center gap-3">
          <Link
            href={isLoggedIn ? '/dashboard' : '/'}
            className="inline-flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Back to Home'}
          </Link>
          <button
            onClick={openCrisp}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Need help? Contact support
          </button>
        </div>
      )}
    </div>
  )
}
