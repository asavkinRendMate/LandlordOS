'use client'

import { useEffect, useState } from 'react'

const STEPS = [
  { label: 'Uploading documents', delay: 0 },
  { label: 'Reading bank statements', delay: 2000 },
  { label: 'Verifying account holder names', delay: 5000 },
  { label: 'Checking statement coverage dates', delay: 8000 },
  { label: 'Extracting income and balance data', delay: 12000 },
  { label: 'Analysing spending patterns', delay: 18000 },
  { label: 'Checking for risk indicators', delay: 25000 },
  { label: 'Calculating financial score', delay: 35000 },
  { label: 'Generating report', delay: 45000 },
]

interface ScoringProgressScreenProps {
  fileCount: number
  isComplete: boolean
}

export default function ScoringProgressScreen({ fileCount, isComplete }: ScoringProgressScreenProps) {
  const [visibleSteps, setVisibleSteps] = useState(1) // first step always visible

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = 1; i < STEPS.length; i++) {
      const timer = setTimeout(() => {
        setVisibleSteps((prev) => Math.max(prev, i + 1))
      }, STEPS[i].delay)
      timers.push(timer)
    }

    return () => timers.forEach(clearTimeout)
  }, [])

  // When complete, show all steps immediately
  useEffect(() => {
    if (isComplete) {
      setVisibleSteps(STEPS.length)
    }
  }, [isComplete])

  return (
    <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <span className="text-[#0f1a0f] font-bold text-xl tracking-tight">LetSorted</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-gray-900 font-bold text-lg">Application submitted</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Analysing {fileCount} statement{fileCount !== 1 ? 's' : ''}…
              </p>
            </div>
          </div>

          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isVisible = i < visibleSteps
              const isDone = isComplete || i < visibleSteps - 1
              const isActive = !isComplete && i === visibleSteps - 1

              if (!isVisible) return null

              return (
                <div
                  key={step.label}
                  className="flex items-center gap-3 py-2 animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  {isDone ? (
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-100 shrink-0" />
                  )}
                  <span className={`text-sm ${isDone ? 'text-gray-700' : isActive ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {!isComplete && (
            <p className="text-xs text-gray-400 mt-4 text-center">This usually takes 1–2 minutes</p>
          )}
        </div>
      </div>
    </div>
  )
}
