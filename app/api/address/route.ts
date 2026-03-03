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
    console.error('[address GET]', err)
    return NextResponse.json({ error: 'Address lookup failed' }, { status: 500 })
  }
}
