declare global {
  interface Window {
    $crisp: unknown[]
    CRISP_WEBSITE_ID: string
  }
}

export function openCrispWithError(errorId: string) {
  if (typeof window === 'undefined' || !window.$crisp) return
  window.$crisp.push(['do', 'chat:open'])
  window.$crisp.push(['set', 'message:text', [
    `Hi, I encountered an error on LetSorted.\n\nReference: ${errorId}\nPage: ${window.location.pathname}\nTime: ${new Date().toISOString()}`
  ]])
}

export function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}`
}
