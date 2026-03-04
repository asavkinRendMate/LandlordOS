import { NextResponse } from 'next/server'
import { lookupPostcode } from '@/lib/os-places'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const postcode = searchParams.get('postcode')?.trim()

  if (!postcode) {
    return NextResponse.json({ error: 'postcode is required' }, { status: 400 })
  }

  try {
    const addresses = await lookupPostcode(postcode)
    return NextResponse.json({ data: addresses })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Address lookup failed'
    console.error('[address GET]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
