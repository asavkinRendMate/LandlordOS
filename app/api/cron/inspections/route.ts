import { NextRequest, NextResponse } from 'next/server'
import { runInspectionReminders } from '@/lib/notifications/cron-inspections'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runInspectionReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[Cron] Inspection reminders failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
