'use client'

import Link from 'next/link'

// ── Score message helper ────────────────────────────────────────────────────

export function scoreMessage(score: number) {
  if (score >= 75) return {
    colour: 'text-green-700 bg-green-50 border-green-200',
    numberColour: 'text-green-700',
    message: 'Strong result — your finances look healthy. Your landlord will review your application and be in touch soon.',
  }
  if (score >= 60) return {
    colour: 'text-amber-700 bg-amber-50 border-amber-200',
    numberColour: 'text-amber-700',
    message: 'Good result overall. Your landlord may want to discuss a couple of points with you — this is completely normal and doesn\'t mean your application has been rejected.',
  }
  if (score >= 45) return {
    colour: 'text-amber-700 bg-amber-50 border-amber-200',
    numberColour: 'text-amber-700',
    message: 'Your application has been submitted. Your landlord will review it and may ask for additional information — such as a guarantor or additional references. Don\'t be discouraged — landlords consider many factors beyond score.',
  }
  return {
    colour: 'text-gray-600 bg-gray-50 border-gray-200',
    numberColour: 'text-gray-600',
    message: 'Your application has been submitted. Your score suggests your landlord may want to discuss your finances further, or ask for supporting documents such as a guarantor or employer reference. We recommend reaching out to your landlord directly to explain your situation — context always helps.',
  }
}

// ── Score card ──────────────────────────────────────────────────────────────

export function CandidateScoreCard({ score, verificationToken }: { score: number; verificationToken: string }) {
  const { colour, numberColour, message } = scoreMessage(score)
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const verifyUrl = `${appUrl}/verify/${verificationToken}`

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-6 ${colour}`}>
        <p className="text-xs uppercase tracking-wide font-medium opacity-70 mb-1">Your reliability score</p>
        <p className={`text-4xl font-extrabold ${numberColour}`}>{score} <span className="text-lg font-semibold opacity-60">points</span></p>
        <p className="text-sm leading-relaxed mt-4">{message}</p>
      </div>

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        This score is one of many factors your landlord will consider. It is not a decision — only your landlord can accept or decline your application.
      </p>

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Verification Link</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={verifyUrl}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => navigator.clipboard.writeText(verifyUrl)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-green-600 transition-colors text-xs font-medium"
          >
            Copy
          </button>
        </div>
        <p className="text-gray-400 text-xs mt-2">Share this link to prove your report is genuine.</p>
      </div>
    </div>
  )
}

// ── Footer ──────────────────────────────────────────────────────────────────

export function CandidateFooter() {
  return (
    <footer className="border-t border-[#F0F0F0] py-8 text-center text-xs text-gray-400">
      <p>
        &copy; 2025 LetSorted Ltd &middot;{' '}
        <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link> &middot;{' '}
        <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link> &middot;{' '}
        <a href="mailto:hello@letsorted.co.uk" className="hover:text-gray-600 transition-colors">hello@letsorted.co.uk</a>
      </p>
    </footer>
  )
}
