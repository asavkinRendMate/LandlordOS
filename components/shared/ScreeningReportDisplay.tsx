'use client'

// ── Types ───────────────────────────────────────────────────────────────────────

export interface ScoringResult {
  id: string
  status: string
  totalScore: number | null
  grade: string | null
  aiSummary: string | null
  breakdown: Record<string, number> | null
  appliedRules: Array<{ key: string; description: string; points: number; category: string }> | null
  verificationToken: string
  hasUnverifiedFiles?: boolean
  verificationWarning?: string | null
  failureReason?: string | null
  createdAt: string
}

interface Props {
  scoring: ScoringResult
  applicantName?: string
  isLocked?: boolean
  onUnlock?: () => void
  unlocking?: boolean
  showVerificationLink?: boolean
  candidateView?: boolean
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function gradeColour(grade: string | null) {
  if (!grade) return 'text-gray-600 bg-gray-50 border-gray-200'
  if (grade === 'Excellent' || grade === 'Good') return 'text-green-700 bg-green-50 border-green-200'
  if (grade === 'Fair') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (grade === 'Poor') return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function ScreeningReportDisplay({
  scoring,
  applicantName,
  isLocked = false,
  onUnlock,
  unlocking = false,
  showVerificationLink = true,
  candidateView = false,
}: Props) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const verifyUrl = `${appUrl}/verify/${scoring.verificationToken}`

  return (
    <div className="space-y-5">
      {/* Score header */}
      <div className={`rounded-2xl border p-6 ${gradeColour(scoring.grade)}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs uppercase tracking-wide font-medium opacity-70">Financial Score</p>
            <p className="text-3xl font-extrabold">{scoring.totalScore}/100</p>
          </div>
          <span className="font-bold text-lg">{scoring.grade}</span>
        </div>
        {applicantName && (
          <p className="text-xs opacity-70 mt-1">{applicantName}</p>
        )}
      </div>

      {/* Candidate-only view stops here */}
      {candidateView && (
        <>
          {showVerificationLink && (
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
          )}
        </>
      )}

      {!candidateView && (
        <>
          {/* AI Summary */}
          {scoring.aiSummary && (
            <div className={`bg-gray-50 rounded-xl border border-gray-100 p-5 ${isLocked ? 'relative overflow-hidden' : ''}`}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">AI Summary</p>
              <p className={`text-gray-700 text-sm leading-relaxed ${isLocked ? 'blur-[6px] select-none' : ''}`}>
                {scoring.aiSummary}
              </p>
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/60">
                  <p className="text-gray-600 font-semibold text-sm">Unlock to see full summary</p>
                </div>
              )}
            </div>
          )}

          {/* Verification warning */}
          {!isLocked && scoring.hasUnverifiedFiles && scoring.verificationWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-amber-700 text-sm">{scoring.verificationWarning}</p>
              </div>
            </div>
          )}

          {/* Score breakdown */}
          {scoring.breakdown && (
            <div className={`bg-white rounded-xl border border-gray-200 p-5 ${isLocked ? 'relative overflow-hidden' : ''}`}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Score Breakdown</p>
              <div className={`space-y-2.5 ${isLocked ? 'blur-[6px] select-none' : ''}`}>
                {Object.entries(scoring.breakdown).map(([cat, score]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-gray-700 text-sm capitalize">{cat.toLowerCase().replace('_', ' ')}</span>
                    <span className={`font-semibold text-sm ${(score as number) > 0 ? 'text-green-600' : (score as number) < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {(score as number) > 0 ? '+' : ''}{score as number}
                    </span>
                  </div>
                ))}
              </div>
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <p className="text-gray-600 font-semibold text-sm">Unlock to see breakdown</p>
                </div>
              )}
            </div>
          )}

          {/* Applied rules */}
          {!isLocked && scoring.appliedRules && scoring.appliedRules.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Applied Rules</p>
              <div className="space-y-2">
                {scoring.appliedRules.map((rule) => (
                  <div key={rule.key} className="flex items-start justify-between gap-3">
                    <span className="text-gray-600 text-xs leading-snug">{rule.description}</span>
                    <span className={`font-semibold text-xs shrink-0 ${rule.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {rule.points > 0 ? '+' : ''}{rule.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unlock button */}
          {isLocked && onUnlock && (
            <button
              onClick={onUnlock}
              disabled={unlocking}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
            >
              {unlocking ? 'Unlocking...' : 'Unlock full report — £9.99'}
            </button>
          )}

          {/* Verification link */}
          {!isLocked && showVerificationLink && (
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
              <p className="text-gray-400 text-xs mt-2">Share this link to prove the report is genuine.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
