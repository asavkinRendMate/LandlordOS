'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type User = {
  id: string
  email: string
  name: string | null
  role: 'Landlord' | 'Tenant' | 'Both' | 'Unknown'
  propertiesCount: number
  tenantProfilesCount: number
  createdAt: string
}

type Property = {
  id: string
  name: string | null
  line1: string
  line2: string | null
  city: string
  postcode: string
  status: string
  ownerEmail: string
  tenantName: string | null
  createdAt: string
}

type DeleteTarget =
  | { type: 'user'; id: string; label: string }
  | { type: 'property'; id: string; label: string }

const ROLE_COLORS: Record<string, string> = {
  Landlord: 'bg-green-100 text-green-800',
  Tenant: 'bg-blue-100 text-blue-800',
  Both: 'bg-purple-100 text-purple-800',
  Unknown: 'bg-gray-100 text-gray-600',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  VACANT: 'bg-gray-100 text-gray-600',
  APPLICATION_OPEN: 'bg-blue-100 text-blue-800',
  OFFER_ACCEPTED: 'bg-yellow-100 text-yellow-800',
  NOTICE_GIVEN: 'bg-orange-100 text-orange-800',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AdminPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    }>
      <AdminPage />
    </Suspense>
  )
}

function AdminPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'users' | 'properties'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showDevTools = process.env.NODE_ENV === 'development' || searchParams.get('dev') === '1'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const endpoint = tab === 'users' ? '/api/admin/users' : '/api/admin/properties'
      const res = await fetch(endpoint)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const body = await res.json()
      if (tab === 'users') setUsers(body.data)
      else setProperties(body.data)
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [tab, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      const endpoint =
        deleteTarget.type === 'user'
          ? `/api/admin/users/${deleteTarget.id}`
          : `/api/admin/properties/${deleteTarget.id}`

      const res = await fetch(endpoint, { method: 'DELETE' })

      if (!res.ok) {
        const body = await res.json()
        showToast(body.error || 'Deletion failed', 'error')
        return
      }

      showToast('Deleted successfully', 'success')
      setDeleteTarget(null)
      fetchData()
    } catch {
      showToast('Deletion failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">LetSorted Admin</h1>
            <nav className="flex gap-4 text-sm">
              <span className="text-gray-900 font-medium">Data</span>
              <Link href="/admin/notifications" className="text-gray-500 hover:text-gray-900">
                Notifications
              </Link>
              <Link href="/admin/screenings" className="text-gray-500 hover:text-gray-900">
                Screenings
              </Link>
              <Link href="/admin/payments" className="text-gray-500 hover:text-gray-900">
                Payments
              </Link>
            </nav>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['users', 'properties'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'users' ? 'Users' : 'Properties'}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : tab === 'users' ? (
          <UsersTable
            users={users}
            onDelete={(u) => setDeleteTarget({ type: 'user', id: u.id, label: u.email })}
          />
        ) : (
          <PropertiesTable
            properties={properties}
            onDelete={(p) =>
              setDeleteTarget({
                type: 'property',
                id: p.id,
                label: `${p.line1}, ${p.postcode}`,
              })
            }
          />
        )}
      </div>

      {/* Developer Tools */}
      {showDevTools && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <DevTools showToast={showToast} />
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete {deleteTarget.type}?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {deleteTarget.type === 'user'
                ? `This will permanently delete ${deleteTarget.label} and ALL their data including properties, tenants, documents, maintenance requests and payment history. This cannot be undone.`
                : `This will permanently delete ${deleteTarget.label} and ALL associated data including tenants, documents, maintenance requests and payment history. This cannot be undone.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-md text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

function UsersTable({
  users,
  onDelete,
}: {
  users: User[]
  onDelete: (u: User) => void
}) {
  if (users.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">No users found.</p>
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Properties</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">{u.email}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{u.name || '\u2014'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[u.role]}`}>
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{u.propertiesCount}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(u.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onDelete(u)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Delete user"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DevTools({ showToast }: { showToast: (message: string, type: 'success' | 'error') => void }) {
  const [contractTenancyId, setContractTenancyId] = useState('')
  const [inspectionId, setInspectionId] = useState('')
  const [resetTenancyId, setResetTenancyId] = useState('')
  const [contractLoading, setContractLoading] = useState(false)
  const [inspectionLoading, setInspectionLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [inspectionResultUrl, setInspectionResultUrl] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  async function handleRegenerateContract() {
    if (!contractTenancyId.trim()) return
    setContractLoading(true)
    setResultUrl(null)
    try {
      const res = await fetch('/api/admin/dev/regenerate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenancyId: contractTenancyId.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        showToast(body.error || 'Failed to regenerate', 'error')
        return
      }
      setResultUrl(body.pdfUrl)
      showToast('Contract PDF regenerated', 'success')
    } catch {
      showToast('Failed to regenerate contract', 'error')
    } finally {
      setContractLoading(false)
    }
  }

  async function handleRegenerateInspection() {
    if (!inspectionId.trim()) return
    setInspectionLoading(true)
    setInspectionResultUrl(null)
    try {
      const res = await fetch('/api/admin/dev/regenerate-inspection-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionId: inspectionId.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        showToast(body.error || 'Failed to regenerate', 'error')
        return
      }
      setInspectionResultUrl(body.pdfUrl)
      showToast('Inspection PDF regenerated', 'success')
    } catch {
      showToast('Failed to regenerate inspection PDF', 'error')
    } finally {
      setInspectionLoading(false)
    }
  }

  async function handleResetContract() {
    if (!resetTenancyId.trim()) return
    setResetLoading(true)
    try {
      const res = await fetch('/api/admin/dev/reset-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenancyId: resetTenancyId.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        showToast(body.error || 'Failed to reset', 'error')
        return
      }
      showToast(body.message, 'success')
      setResetTenancyId('')
    } catch {
      showToast('Failed to reset contract', 'error')
    } finally {
      setResetLoading(false)
      setShowResetConfirm(false)
    }
  }

  const inputClass = 'flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent'
  const btnClass = 'px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 whitespace-nowrap'

  return (
    <div className="border border-amber-300 bg-amber-50 rounded-lg p-6 mt-6">
      <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-4">Developer Tools</h2>

      <div className="space-y-4">
        {/* Tool 1: Regenerate Contract PDF */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contract PDF Regeneration</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tenancy ID"
              value={contractTenancyId}
              onChange={(e) => setContractTenancyId(e.target.value)}
              className={inputClass}
            />
            <button
              onClick={handleRegenerateContract}
              disabled={contractLoading || !contractTenancyId.trim()}
              className={`${btnClass} bg-gray-800 hover:bg-gray-900`}
            >
              {contractLoading ? 'Generating...' : 'Regenerate PDF'}
            </button>
          </div>
          {resultUrl && (
            <p className="mt-1 text-xs text-green-700">
              Saved to: <code className="bg-green-100 px-1 py-0.5 rounded">{resultUrl}</code>
            </p>
          )}
        </div>

        {/* Tool 2: Regenerate Inspection PDF */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Inspection PDF Regeneration</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Inspection ID"
              value={inspectionId}
              onChange={(e) => setInspectionId(e.target.value)}
              className={inputClass}
            />
            <button
              onClick={handleRegenerateInspection}
              disabled={inspectionLoading || !inspectionId.trim()}
              className={`${btnClass} bg-gray-800 hover:bg-gray-900`}
            >
              {inspectionLoading ? 'Generating...' : 'Regenerate PDF'}
            </button>
          </div>
          {inspectionResultUrl && (
            <p className="mt-1 text-xs text-green-700">
              Saved to: <code className="bg-green-100 px-1 py-0.5 rounded">{inspectionResultUrl}</code>
            </p>
          )}
        </div>

        {/* Tool 3: Reset Contract */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Reset Contract (delete + allow regeneration)</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tenancy ID"
              value={resetTenancyId}
              onChange={(e) => setResetTenancyId(e.target.value)}
              className={inputClass}
            />
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetLoading || !resetTenancyId.trim()}
              className={`${btnClass} bg-red-600 hover:bg-red-700`}
            >
              {resetLoading ? 'Resetting...' : 'Reset Contract'}
            </button>
          </div>
        </div>
      </div>

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900">Reset contract?</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will delete the contract and all signature data for tenancy <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{resetTenancyId}</code>. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetContract}
                disabled={resetLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {resetLoading ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PropertiesTable({
  properties,
  onDelete,
}: {
  properties: Property[]
  onDelete: (p: Property) => void
}) {
  if (properties.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">No properties found.</p>
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {properties.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">
                {p.name ? (
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <br />
                    <span className="text-gray-500">{p.line1}, {p.postcode}</span>
                  </span>
                ) : (
                  `${p.line1}, ${p.postcode}`
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{p.ownerEmail}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{p.tenantName || 'Vacant'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                  {formatStatus(p.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onDelete(p)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Delete property"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
