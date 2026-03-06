'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { STANDALONE_PACKAGES, SUBSCRIBER_PRICING } from '@/lib/screening-pricing'

export default function PackagesPage() {
  const router = useRouter()

  function handleBuy(packageType: string) {
    router.push(`/login?next=${encodeURIComponent(`/screening/use?buy=${packageType}`)}`)
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} priority />
          </Link>
          <Link
            href="/screening"
            className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 text-sm transition-colors"
          >
            Back to screening
          </Link>
        </div>
      </nav>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Screening credit packs
            </h1>
            <p className="text-gray-400 text-lg">Buy credits to run checks from your dashboard. Credits never expire.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STANDALONE_PACKAGES.map((pkg) => (
              <div
                key={pkg.type}
                className={`rounded-2xl border-2 bg-white p-6 relative transition-all duration-150 hover:shadow-md ${
                  pkg.type === 'TRIPLE' ? 'border-green-500' : 'border-gray-200'
                }`}
              >
                {pkg.type === 'TRIPLE' && (
                  <span className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Best value
                  </span>
                )}
                {pkg.savings && (
                  <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                    {pkg.savings}
                  </span>
                )}
                {!pkg.savings && <div className="mb-3 h-6" />}
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{pkg.label}</p>
                <p className="text-3xl font-extrabold text-gray-900">{pkg.priceDisplay}</p>
                <p className="text-gray-400 text-sm mt-1 mb-1">
                  {pkg.credits} check{pkg.credits !== 1 ? 's' : ''}
                </p>
                <p className="text-green-600 text-xs font-medium mb-5">{pkg.perCheckDisplay} per check</p>
                <button
                  onClick={() => handleBuy(pkg.type)}
                  className={`w-full font-semibold py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                    pkg.type === 'TRIPLE'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'border border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-600'
                  }`}
                >
                  Buy pack
                </button>
              </div>
            ))}
          </div>

          {/* Subscriber callout */}
          <div className="mt-8 bg-green-50 rounded-2xl p-6 border border-green-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-gray-900 mb-1">Already a LetSorted subscriber?</p>
                <p className="text-gray-500 text-sm">
                  Run checks from your dashboard for just{' '}
                  <span className="font-semibold text-green-700">{SUBSCRIBER_PRICING.firstCheckDisplay}</span> first check,{' '}
                  <span className="font-semibold text-green-700">{SUBSCRIBER_PRICING.additionalCheckDisplay}</span> each additional.
                </p>
              </div>
              <Link
                href="/login?next=/dashboard"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150 whitespace-nowrap"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
