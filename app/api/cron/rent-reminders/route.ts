import { NextRequest, NextResponse } from 'next/server'
import { runRentReminders } from '@/lib/notifications/cron-rent-reminders'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runRentReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[Cron] Rent reminders failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
