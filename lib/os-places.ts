// OS Places API v1 — postcode address lookup
// Docs: https://osdatahub.os.uk/docs/places/technicalSpecification

const OS_API_BASE = 'https://api.os.uk/search/places/v1'

export interface OsAddress {
  uprn: string
  singleLine: string // Full formatted address
  line1: string
  line2: string | null
  city: string
  postcode: string
}

interface OsDpaResult {
  DPA: {
    UPRN: string
    ADDRESS: string
    SUB_BUILDING_NAME?: string
    BUILDING_NAME?: string
    BUILDING_NUMBER?: string
    DEPENDENT_THOROUGHFARE_NAME?: string
    THOROUGHFARE_NAME?: string
    POST_TOWN: string
    POSTCODE: string
  }
}

interface OsApiResponse {
  results?: OsDpaResult[]
  header?: { totalresults: number }
}

function buildLine1(dpa: OsDpaResult['DPA']): string {
  const parts: string[] = []

  if (dpa.SUB_BUILDING_NAME) parts.push(dpa.SUB_BUILDING_NAME)
  if (dpa.BUILDING_NAME) parts.push(dpa.BUILDING_NAME)
  if (dpa.BUILDING_NUMBER) parts.push(dpa.BUILDING_NUMBER)

  const road = dpa.THOROUGHFARE_NAME ?? dpa.DEPENDENT_THOROUGHFARE_NAME ?? ''
  if (road) parts.push(road)

  return parts.join(' ').trim()
}

export async function lookupPostcode(postcode: string): Promise<OsAddress[]> {
  const apiKey = process.env.OS_API_KEY
  if (!apiKey) throw new Error('OS_API_KEY is not configured')

  const clean = postcode.replace(/\s+/g, '').toUpperCase()
  const url = `${OS_API_BASE}/postcode?postcode=${encodeURIComponent(clean)}&key=${apiKey}&maxresults=20&dataset=DPA`

  const res = await fetch(url, { next: { revalidate: 3600 } })

  if (res.status === 400) return [] // Invalid postcode — return empty
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OS Places API error: ${res.status} ${body}`)
  }

  const data: OsApiResponse = await res.json()
  if (!data.results) return []

  return data.results.map(({ DPA: dpa }) => ({
    uprn: dpa.UPRN,
    singleLine: dpa.ADDRESS,
    line1: buildLine1(dpa),
    line2: null,
    city: dpa.POST_TOWN,
    postcode: dpa.POSTCODE,
  }))
}
