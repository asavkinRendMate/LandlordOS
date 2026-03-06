'use client'

import { useEffect } from 'react'

// Configure welcome message in Crisp dashboard:
// Chatbox > Customize > Welcome message:
// "Hi! 👋 Got a question? We're real people here — no bots. Usually reply within a few hours."

declare global {
  interface Window {
    $crisp: unknown[]
    CRISP_WEBSITE_ID: string
  }
}

interface CrispChatProps {
  /** Identify the user to Crisp for landlord/tenant sessions */
  user?: {
    email: string
    name?: string | null
    id: string
  }
  /** Role for session data — "landlord" or "tenant" */
  role?: 'landlord' | 'tenant'
}

export default function CrispChat({ user, role }: CrispChatProps) {
  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID
    if (!websiteId) return

    // Prevent double-injection
    if (document.getElementById('crisp-script')) return

    window.$crisp = []
    window.CRISP_WEBSITE_ID = websiteId

    const script = document.createElement('script')
    script.src = 'https://client.crisp.chat/l.js'
    script.async = true
    script.id = 'crisp-script'
    document.head.appendChild(script)
  }, [])

  // Identify user once Crisp is loaded
  useEffect(() => {
    if (!user || !process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID) return
    if (!window.$crisp) return

    window.$crisp.push(['set', 'user:email', [user.email]])
    if (user.name) {
      window.$crisp.push(['set', 'user:nickname', [user.name]])
    }
    if (role) {
      window.$crisp.push([
        'set',
        'session:data',
        [[
          ['role', role],
          ['userId', user.id],
        ]],
      ])
    }
  }, [user, role])

  return null
}

/** Open the Crisp chat widget programmatically */
export function openCrispChat() {
  if (typeof window !== 'undefined' && window.$crisp) {
    window.$crisp.push(['do', 'chat:open'])
  }
}
