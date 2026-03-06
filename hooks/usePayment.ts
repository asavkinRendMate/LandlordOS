'use client'

import { useState, useRef, useCallback } from 'react'

export function usePayment() {
  const [showCardModal, setShowCardModal] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)

  const requireCard = useCallback(async (action: () => void) => {
    try {
      const res = await fetch('/api/payment/has-card')
      const json = await res.json()

      if (json.data?.hasCard) {
        action()
      } else {
        pendingActionRef.current = action
        setShowCardModal(true)
      }
    } catch {
      // If check fails, prompt for card to be safe
      pendingActionRef.current = action
      setShowCardModal(true)
    }
  }, [])

  const onCardSaveComplete = useCallback(() => {
    setShowCardModal(false)
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (action) action()
  }, [])

  const closeCardModal = useCallback(() => {
    setShowCardModal(false)
    pendingActionRef.current = null
  }, [])

  return {
    showCardModal,
    requireCard,
    onCardSaveComplete,
    closeCardModal,
  }
}
