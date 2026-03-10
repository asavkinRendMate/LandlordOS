import Image from 'next/image'
import Link from 'next/link'

interface ScreeningLayoutProps {
  children: React.ReactNode
  /** Optional right-side nav link */
  navLink?: { href: string; label: string }
}

export default function ScreeningLayout({ children, navLink }: ScreeningLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f5f7f2]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 py-3 md:px-6 md:py-0 md:h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-icon.svg" alt="LetSorted" width={32} height={32} className="md:hidden" priority />
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="hidden md:block" priority />
          </Link>
          {navLink && (
            <Link
              href={navLink.href}
              className="text-gray-500 hover:text-gray-700 text-xs md:text-sm font-medium"
            >
              {navLink.label}
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-lg mx-auto py-10 px-4">
        {children}
      </div>

      <div className="text-center pb-8">
        <Link href="/" className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors">
          Powered by LetSorted
        </Link>
        <p className="text-gray-300 text-xs mt-1">letsorted.co.uk</p>
      </div>
    </div>
  )
}
