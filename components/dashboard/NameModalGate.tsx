'use client'

import { useState } from 'react'
import NameModal from './NameModal'

interface NameModalGateProps {
  needsName: boolean
  children: React.ReactNode
}

export default function NameModalGate({ needsName, children }: NameModalGateProps) {
  const [showModal, setShowModal] = useState(needsName)

  return (
    <>
      {showModal && <NameModal onComplete={() => setShowModal(false)} />}
      {children}
    </>
  )
}
