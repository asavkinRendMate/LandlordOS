import { getAllUpdates } from '@/lib/updates'
import LandingPage from './client'

export default function HomePage() {
  const allUpdates = getAllUpdates()
  const latest = allUpdates.slice(0, 3).map(({ title, date, tag, summary }) => ({
    title,
    date,
    tag,
    summary,
  }))

  return <LandingPage updates={latest} />
}
