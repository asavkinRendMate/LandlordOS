import { toast } from 'sonner'
import { openCrispWithError, generateErrorId } from '@/lib/crisp-support'

export function showErrorToast(error?: {
  message?: string
  status?: number
  context?: string
}) {
  const errorId = generateErrorId()
  toast.error(error?.message || 'Something went wrong. Try again or contact support.', {
    duration: 8000,
    description: `Reference: ${errorId}`,
    action: {
      label: 'Talk to Support',
      onClick: () => openCrispWithError(errorId),
    },
  })
}
