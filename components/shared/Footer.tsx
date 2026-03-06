import Image from 'next/image'
import Link from 'next/link'

interface FooterProps {
  variant: 'marketing' | 'app'
}

export default function Footer({ variant }: FooterProps) {
  if (variant === 'app') {
    return (
      <footer className="border-t border-black/[0.06] px-6 py-4 bg-[#F7F8F6]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#9CA3AF]">
          <span>© 2026 Rendmate Ltd. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/cookies" className="hover:text-gray-600 transition-colors">Cookies</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t border-gray-100 bg-gray-50 px-6 pt-12 pb-0 text-sm text-gray-500">
      <div className="max-w-5xl mx-auto">

        {/* Three-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 pb-10">

          {/* Company info */}
          <div className="space-y-3">
            <Image src="/logo.svg" alt="LetSorted" width={110} height={37} />
            <p className="text-gray-400 text-xs leading-relaxed">
              A product of Rendmate Ltd<br />
              Company number: 14230492<br />
              167–169 Great Portland Street,<br />
              London, England, W1W 5PF
            </p>
            <p className="text-gray-400 text-xs">
              Rendmate Ltd is registered in England and Wales.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Legal</p>
            <Link href="/privacy" className="block text-gray-500 hover:text-gray-800 transition-colors text-xs">
              Privacy Policy
            </Link>
            <Link href="/cookies" className="block text-gray-500 hover:text-gray-800 transition-colors text-xs">
              Cookie Policy
            </Link>
            <Link href="/terms" className="block text-gray-500 hover:text-gray-800 transition-colors text-xs">
              Terms of Service
            </Link>
            <a href="mailto:hello@letsorted.co.uk" className="block text-gray-500 hover:text-gray-800 transition-colors text-xs">
              Contact
            </a>
          </div>

          {/* Trust badges */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Trust &amp; Security</p>
            <p className="text-gray-500 text-xs">🔒 SSL Secured</p>
            <p className="text-gray-500 text-xs">🇬🇧 Built for UK Landlords</p>
            <p className="text-gray-500 text-xs">✓ GDPR Compliant</p>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-400">
          <span>© 2026 Rendmate Ltd. All rights reserved.</span>
          <span>LetSorted is not a law firm and does not provide legal advice.</span>
        </div>

      </div>
    </footer>
  )
}
