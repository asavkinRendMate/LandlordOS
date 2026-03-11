// Legacy redirect — existing email links use /check-in/[token]
import { redirect } from 'next/navigation'

export default function LegacyCheckInPage({ params }: { params: { token: string } }) {
  redirect(`/tenant/inspection/${params.token}`)
}
