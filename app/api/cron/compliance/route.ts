import { NextRequest, NextResponse } from 'next/server'
import { runComplianceAlerts } from '@/lib/notifications/cron-compliance'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runComplianceAlerts()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[Cron] Compliance alerts failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
