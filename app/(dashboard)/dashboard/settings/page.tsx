'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const inputClass =
  'w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => {
        if (res.status === 401) { router.push('/login'); return null }
        return res.json()
      })
      .then((json) => {
        if (json?.data) {
          setName(json.data.name ?? '')
          setEmail(json.data.email ?? '')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [router])

  async function handleSave() {
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return }
    setSaving(true)
    setError(null)
    setSaved(false)
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
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-[#1A1A1A] text-xl font-semibold mb-6">Settings</h1>

      <div className="max-w-lg">
        <div className="bg-white border border-black/[0.06] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_4px_12px_rgba(0,0,0,0.04)]">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Profile</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Johnson or Riverside Properties"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1">Shown to tenants and candidates in emails from LetSorted.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-gray-500 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email is managed through your login. Contact support to change it.</p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              {saved && <span className="text-green-600 text-sm font-medium">Saved</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
