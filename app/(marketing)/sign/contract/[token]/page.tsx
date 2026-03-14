'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { inputClass, buttonClass } from '@/lib/form-styles'
import { cardClass, Spinner, StatusBadge } from '@/lib/ui'
import { showErrorToast } from '@/lib/error-toast'

interface ContractData {
  id: string
  status: string
  type: string
  role: 'landlord' | 'tenant'
  landlordName: string
  tenantName: string
  landlordSignedAt: string | null
  landlordSignedName: string | null
  tenantSignedAt: string | null
  tenantSignedName: string | null
  pdfUrl: boolean
  property: { line1: string; line2?: string; city: string; postcode: string; name?: string }
  createdAt: string
}

export default function SignContractPage() {
  const { token } = useParams<{ token: string }>()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [pdfSrc, setPdfSrc] = useState<string | null>(null)
  const [pdfExpired, setPdfExpired] = useState(false)

  function fetchPdfUrl() {
    setPdfExpired(false)
    fetch(`/api/contracts/token/${token}/pdf-url`, { redirect: 'follow' })
      .then((r) => { if (r.ok) setPdfSrc(r.url) })
      .catch(() => {})
  }

  useEffect(() => {
    fetch(`/api/contracts/token/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error)
        else {
          setContract(json.data)
          if (json.data?.pdfUrl) fetchPdfUrl()
        }
      })
      .catch(() => setError('Failed to load contract'))
      .finally(() => setLoading(false))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSign() {
    if (!name.trim()) return
    setSigning(true)
    try {
      const res = await fetch(`/api/contracts/token/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        showErrorToast({ message: json.error ?? 'Failed to sign' })
        return
      }
      setSigned(true)
      // Refresh contract data and PDF (re-generated with signatures)
      const refresh = await fetch(`/api/contracts/token/${token}`)
      const refreshJson = await refresh.json()
      if (refreshJson.data) {
        setContract(refreshJson.data)
        if (refreshJson.data.pdfUrl) fetchPdfUrl()
      }
    } catch {
      showErrorToast({ message: 'Something went wrong' })
    } finally {
      setSigning(false)
    }
  }

  const propertyAddress = contract
    ? `${contract.property.line1}${contract.property.line2 ? `, ${contract.property.line2}` : ''}, ${contract.property.city} ${contract.property.postcode}`
    : ''

  const alreadySigned = contract && (
    (contract.role === 'landlord' && contract.landlordSignedAt) ||
    (contract.role === 'tenant' && contract.tenantSignedAt)
  )

  return (
    <div className="min-h-screen bg-[#f5f7f2]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <img src="/logo.png" alt="LetSorted" className="h-8" />
          <span className="text-sm text-[#6B7280]">Tenancy Agreement</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : error ? (
          <div className={cardClass}>
            <p className="text-center text-[#6B7280]">{error}</p>
          </div>
        ) : contract ? (
          <>
            {/* RRA 2025 Disclaimer */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 flex gap-3 items-start">
              <span className="text-amber-500 text-xl mt-0.5">&#9888;&#65039;</span>
              <div>
                <p className="font-semibold text-amber-900 text-sm">
                  This agreement is designed for use from 1 May 2026
                </p>
                <p className="text-amber-800 text-sm mt-1">
                  This tenancy agreement is drafted under the Renters&apos; Rights Act 2025
                  and creates an Assured Periodic Tenancy. It should not be used for
                  tenancies starting before 1 May 2026 — existing assured shorthold
                  tenancy rules apply until that date. If your tenancy starts before
                  1 May 2026, please use a traditional AST agreement instead.
                </p>
                <a
                  href="https://www.gov.uk/government/collections/renters-reform-bill"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 underline text-sm mt-1 inline-block"
                >
                  Learn more about the Renters&apos; Rights Act 2025 &rarr;
                </a>
              </div>
            </div>

            {/* Contract Info */}
            <div className={`${cardClass} mb-6`}>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-semibold text-[#1A1A1A]">Tenancy Agreement</h1>
                <StatusBadge status={contract.status} />
              </div>
              <div className="text-sm text-[#6B7280] space-y-1">
                <p><span className="font-medium text-[#1A1A1A]">Property:</span> {propertyAddress}</p>
                <p><span className="font-medium text-[#1A1A1A]">Landlord:</span> {contract.landlordName}</p>
                <p><span className="font-medium text-[#1A1A1A]">Tenant:</span> {contract.tenantName}</p>
              </div>

              {/* Signature status */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${contract.landlordSignedAt ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <span className="text-[#6B7280]">
                    Landlord: {contract.landlordSignedAt
                      ? `Signed by ${contract.landlordSignedName}`
                      : 'Awaiting signature'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${contract.tenantSignedAt ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <span className="text-[#6B7280]">
                    Tenant: {contract.tenantSignedAt
                      ? `Signed by ${contract.tenantSignedName}`
                      : 'Awaiting signature'}
                  </span>
                </div>
              </div>
            </div>

            {/* PDF Viewer */}
            {contract.pdfUrl && pdfSrc && (
              <div className="mb-6">
                {pdfExpired && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-2 text-sm text-amber-800">
                    <span>PDF link may have expired.</span>
                    <button
                      onClick={fetchPdfUrl}
                      className="font-medium text-amber-700 hover:text-amber-900 underline"
                    >
                      Reload PDF
                    </button>
                  </div>
                )}
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                  <iframe
                    src={`${pdfSrc}#navpanes=0&view=FitH`}
                    className="w-full rounded-lg border border-gray-200"
                    style={{ height: '70vh' }}
                    title="Tenancy Agreement"
                    onError={() => setPdfExpired(true)}
                  />
                </div>
                {!pdfExpired && (
                  <button
                    onClick={fetchPdfUrl}
                    className="mt-2 text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  >
                    Reload PDF
                  </button>
                )}
              </div>
            )}

            {/* Signing Form or Status */}
            <div className={cardClass}>
              {signed || alreadySigned ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">
                    {contract.status === 'BOTH_SIGNED' ? 'Contract fully signed' : 'Signed successfully'}
                  </h2>
                  <p className="text-sm text-[#6B7280]">
                    {contract.status === 'BOTH_SIGNED'
                      ? 'Both parties have signed. You will receive a confirmation email.'
                      : 'Waiting for the other party to sign.'}
                  </p>
                </div>
              ) : contract.status === 'VOIDED' ? (
                <div className="text-center py-4">
                  <p className="text-sm text-[#6B7280]">This contract has been voided.</p>
                </div>
              ) : (
                <div>
                  <h2 className="text-base font-semibold text-[#1A1A1A] mb-1">
                    Sign as {contract.role === 'landlord' ? 'landlord' : 'tenant'}
                  </h2>
                  <p className="text-sm text-[#6B7280] mb-4">
                    By typing your full name below, you agree to the terms of this tenancy agreement.
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Type your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      autoComplete="name"
                    />
                    <button
                      onClick={handleSign}
                      disabled={!name.trim() || signing}
                      className={buttonClass}
                    >
                      {signing ? <Spinner size="sm" /> : 'Sign contract'}
                    </button>
                  </div>
                  <p className="text-xs text-[#9CA3AF] mt-3">
                    Your signature, name, IP address, and timestamp will be recorded.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
