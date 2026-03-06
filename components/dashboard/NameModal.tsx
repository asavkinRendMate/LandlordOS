'use client'

import { useState } from 'react'
import Image from 'next/image'

interface NameModalProps {
  onComplete: (name: string) => void
}

export default function NameModal({ onComplete }: NameModalProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Something went wrong')
        return
      }
      onComplete(name.trim())
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
        <div className="text-center mb-8">
          <Image src="/logo.svg" alt="LetSorted" width={140} height={46} priority className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to LetSorted</h1>
          <p className="text-gray-500 text-sm">Before we get started — what should we call you?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your name or company name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Johnson or Riverside Properties"
              autoFocus
              className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1.5">This is shown to tenants in emails and communications.</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={name.trim().length < 2 || saving}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
