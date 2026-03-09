import { NextRequest, NextResponse } from 'next/server'
import { runAwaabsLawAlerts } from '@/lib/notifications/cron-awaabs'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sentCount = await runAwaabsLawAlerts()
    return NextResponse.json({ ok: true, sentCount })
  } catch (error) {
    console.error('[Cron] Awaab\'s Law alerts failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
