import Link from 'next/link'

export default function DemoUpsell() {
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
      <p className="font-medium">This feature is available in a real account.</p>
      <p className="mt-1 text-amber-700">
        You&apos;re exploring a demo. Create a free account to generate contracts,
        run tenant screening, and more.
      </p>
      <Link href="/login" className="mt-3 inline-block font-medium underline text-amber-900">
        Create free account &rarr;
      </Link>
    </div>
  )
}
