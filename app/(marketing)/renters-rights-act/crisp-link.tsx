'use client'

import { openCrispChat } from '@/components/shared/CrispChat'

export function CrispChatLink() {
  return (
    <p className="text-green-200/60 text-sm mt-6">
      Have a question?{' '}
      <button
        type="button"
        onClick={openCrispChat}
        className="text-white underline underline-offset-2 hover:text-green-100 font-medium"
      >
        Chat with us — we&apos;re real people, not a bot.
      </button>
    </p>
  )
}
