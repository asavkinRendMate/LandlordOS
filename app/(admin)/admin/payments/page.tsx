import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { STANDALONE_PACKAGES, SUBSCRIBER_PRICING } from '@/lib/screening-pricing'
import { CHARGE_AMOUNTS } from '@/lib/payment-service'

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

export default async function AdminPaymentsPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  if (session !== 'authenticated') {
    redirect('/admin/login')
  }

  const stripePriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID ?? null
  const stripeSecretSet = !!process.env.STRIPE_SECRET_KEY
  const stripeWebhookSet = !!process.env.STRIPE_WEBHOOK_SECRET

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">LetSorted Admin</h1>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-gray-500 hover:text-gray-900">
                Data
              </Link>
              <Link href="/admin/notifications" className="text-gray-500 hover:text-gray-900">
                Notifications
              </Link>
              <Link href="/admin/screenings" className="text-gray-500 hover:text-gray-900">
                Screenings
              </Link>
              <span className="text-gray-900 font-medium">Payments</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Payment Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Live pricing config and feature readiness. Values pulled from DB and env at render time.
          </p>
        </div>

        {/* Stripe env status */}
        <div className="mb-8 flex gap-2 flex-wrap">
          <EnvBadge label="STRIPE_SECRET_KEY" set={stripeSecretSet} />
          <EnvBadge label="STRIPE_WEBHOOK_SECRET" set={stripeWebhookSet} />
          <EnvBadge label="STRIPE_SUBSCRIPTION_PRICE_ID" set={!!stripePriceId} value={stripePriceId} />
        </div>

        {/* Section 1 — Subscription Pricing */}
        <section className="mb-10">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
            Subscription Pricing
          </h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">1st property</td>
                  <td className="px-4 py-3 text-sm text-gray-900">Free</td>
                  <td className="px-4 py-3 text-sm text-gray-500">&mdash;</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">Hardcoded</td>
                  <td className="px-4 py-3">
                    <StatusBadge status="mock" label="LIVE (mock — Stripe Phase 2 pending)" />
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">2nd+ property</td>
                  <td className="px-4 py-3 text-sm text-gray-900">£9.99</td>
                  <td className="px-4 py-3 text-sm text-gray-500">/month per property</td>
                  <td className="px-4 py-3 text-sm font-mono">
                    <span className="text-gray-500">SPEC / env: </span>
                    {stripePriceId ? (
                      <span className="text-gray-900">{stripePriceId}</span>
                    ) : (
                      <span className="text-red-600 font-medium">NOT SET</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status="mock" label="MOCK — Phase 2" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2 — Screening Unlock Pricing */}
        <section className="mb-10">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
            Screening Unlock Pricing
          </h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scenario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Subscriber rows */}
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">Subscriber</td>
                  <td className="px-4 py-3 text-sm text-gray-600">First unlock per cycle</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                    {SUBSCRIBER_PRICING.firstCheckDisplay}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status="mock" label="MOCK — real PaymentIntent pending" />
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">Subscriber</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Additional unlock (same cycle)</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                    {SUBSCRIBER_PRICING.additionalCheckDisplay}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status="mock" label="MOCK — real PaymentIntent pending" />
                  </td>
                </tr>
                {/* Pack rows — pulled from STANDALONE_PACKAGES */}
                {STANDALONE_PACKAGES.map((pkg) => (
                  <tr key={pkg.type} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">Standalone</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {pkg.credits} check pack ({pkg.label})
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">{pkg.priceDisplay}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status="mock" label="MOCK — real PaymentIntent pending" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Values from <code className="bg-gray-100 px-1 py-0.5 rounded">lib/screening-pricing.ts</code>
          </p>
        </section>

        {/* Section 3 — Pay-Per-Use Features */}
        <section className="mb-10">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
            Pay-Per-Use Features
          </h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">APT Contract Generation</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                    {formatPence(CHARGE_AMOUNTS.APT_CONTRACT)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">CHARGE_AMOUNTS</td>
                  <td className="px-4 py-3">
                    <StatusBadge status="not_started" label="NOT STARTED" />
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Inventory Report PDF</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                    {formatPence(CHARGE_AMOUNTS.INVENTORY_REPORT)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">CHARGE_AMOUNTS</td>
                  <td className="px-4 py-3">
                    <StatusBadge status="not_started" label="NOT STARTED" />
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Dispute Evidence Pack</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                    {formatPence(CHARGE_AMOUNTS.DISPUTE_PACK)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">CHARGE_AMOUNTS</td>
                  <td className="px-4 py-3">
                    <StatusBadge status="not_started" label="NOT STARTED" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Values from <code className="bg-gray-100 px-1 py-0.5 rounded">lib/payment-service.ts</code>
          </p>
        </section>
      </div>
    </div>
  )
}

function StatusBadge({ status, label }: { status: 'live' | 'mock' | 'not_started'; label: string }) {
  const colors = {
    live: 'bg-green-100 text-green-800',
    mock: 'bg-yellow-100 text-yellow-800',
    not_started: 'bg-gray-100 text-gray-600',
  }

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${colors[status]}`}>
      {label}
    </span>
  )
}

function EnvBadge({ label, set, value }: { label: string; set: boolean; value?: string | null }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md border ${
        set ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${set ? 'bg-green-500' : 'bg-red-500'}`} />
      {label}
      {set && value && (
        <span className="text-green-600 ml-1">= {value}</span>
      )}
      {!set && <span className="ml-1">NOT SET</span>}
    </span>
  )
}
