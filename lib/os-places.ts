// OS Names API v1 — postcode lookup
// Docs: https://osdatahub.os.uk/docs/names/technicalSpecification

const OS_API_BASE = 'https://api.os.uk/search/names/v1'

export interface OsAddress {
  uprn: string
  singleLine: string
  line1: string
  line2: string | null
  city: string
  postcode: string
}

interface OsNamesEntry {
  ID: string
  NAME1: string
  LOCAL_TYPE: string
  POPULATED_PLACE?: string
  DISTRICT_BOROUGH?: string
  COUNTY_UNITARY?: string
}

interface OsNamesResponse {
  header?: { totalresults: number }
  results?: Array<{ GAZETTEER_ENTRY: OsNamesEntry }>
}

export async function lookupPostcode(postcode: string): Promise<OsAddress[]> {
  const apiKey = process.env.OS_API_KEY
  if (!apiKey) throw new Error('OS_API_KEY is not configured')

  const clean = postcode.replace(/\s+/g, '').toUpperCase()
  const url = `${OS_API_BASE}/find?query=${encodeURIComponent(clean)}&key=${apiKey}&fq=LOCAL_TYPE:Postcode&maxResults=1`

  const res = await fetch(url, { next: { revalidate: 3600 } })

  if (res.status === 400) return []
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OS Names API error: ${res.status} ${body}`)
  }

  const data: OsNamesResponse = await res.json()
  if (!data.results?.length) return []

  return data.results.map(({ GAZETTEER_ENTRY: e }) => {
    const city = e.POPULATED_PLACE ?? e.DISTRICT_BOROUGH ?? e.COUNTY_UNITARY ?? ''
    // Format postcode with a space if missing (e.g. "S426UG" → "S42 6UG")
    const formatted = e.NAME1.length > 3 && !e.NAME1.includes(' ')
      ? `${e.NAME1.slice(0, -3)} ${e.NAME1.slice(-3)}`
      : e.NAME1
    return {
      uprn: e.ID,
      singleLine: city ? `${formatted} — ${city}` : formatted,
      line1: '',
      line2: null,
      city,
      postcode: formatted,
    }
  })
}
