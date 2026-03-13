'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal, Spinner } from '@/lib/ui'
import { buttonClass } from '@/lib/form-styles'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  'Creating your demo account',
  'Setting up a sample property',
  'Adding tenant and rent history',
  'Preparing maintenance and documents',
  'Almost ready...',
]

const STEP_INTERVAL = 1500

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [screen, setScreen] = useState<'confirm' | 'loading'>('confirm')
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setScreen('confirm')
      setCurrentStep(0)
      setError(null)
      doneRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isOpen])

  const startDemo = useCallback(async () => {
    setScreen('loading')
    setCurrentStep(0)
    setError(null)
    doneRef.current = false

    // Start step animation
    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1
        return prev
      })
    }, STEP_INTERVAL)

    try {
      const res = await fetch('/api/demo/create', { method: 'POST' })
      const json = await res.json()

      if (!res.ok || !json.data) {
        throw new Error('Failed')
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: json.data.email,
        password: json.data.password,
      })

      if (signInError) {
        throw new Error('Sign-in failed')
      }

      // API succeeded — mark done, show all steps green briefly
      doneRef.current = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setCurrentStep(STEPS.length)

      // Brief pause to show all-green, then redirect
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 500)
    } catch {
      doneRef.current = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setError('Something went wrong. Please try again.')
      setScreen('confirm')
    }
  }, [])

  // Prevent close during loading
  const handleClose = () => {
    if (screen === 'loading') return
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={screen === 'confirm' ? 'Try LetSorted free' : undefined}>
      {screen === 'confirm' ? (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            We&apos;ll set up a demo account with realistic sample data so you can
            explore the full product instantly — no sign-up required.
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">&#10003;</span>
              Sample property with a tenant already set up
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">&#10003;</span>
              Rent payments, maintenance requests &amp; docs
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">&#10003;</span>
              AI tenant screening report ready to view
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">&#10003;</span>
              Demo data resets automatically after 24 hours
            </li>
          </ul>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button onClick={startDemo} className={buttonClass}>
            Start exploring &rarr;
          </button>
          <p className="text-xs text-center text-gray-400">
            No credit card required. No commitment.
          </p>
        </div>
      ) : (
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-500 text-center">
            Setting up your demo account...
          </p>
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {currentStep > i ? (
                  <span className="text-green-500 w-4 h-4 flex items-center justify-center shrink-0">&#10003;</span>
                ) : currentStep === i ? (
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-gray-300 shrink-0" />
                )}
                <span className={currentStep >= i ? 'text-gray-800' : 'text-gray-400'}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
