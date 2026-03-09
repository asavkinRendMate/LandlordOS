'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  NOTIFICATION_LIST,
  getNotificationsByTrigger,
  type NotificationDefinition,
  type NotificationStatus,
} from '@/lib/notifications/registry'

const STATUS_BADGE: Record<NotificationStatus, string> = {
  live: 'bg-green-100 text-green-800',
  not_started: 'bg-gray-100 text-gray-600',
  coming_soon: 'bg-yellow-100 text-yellow-800',
}

const STATUS_LABEL: Record<NotificationStatus, string> = {
  live: 'Live',
  not_started: 'Not Started',
  coming_soon: 'Coming Soon',
}

export default function AdminNotificationsPage() {
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const eventNotifications = getNotificationsByTrigger('event')
  const cronNotifications = getNotificationsByTrigger('cron')

  const liveCount = NOTIFICATION_LIST.filter((n) => n.status === 'live').length
  const notStartedCount = NOTIFICATION_LIST.filter((n) => n.status === 'not_started').length
  const comingSoonCount = NOTIFICATION_LIST.filter((n) => n.status === 'coming_soon').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">LetSorted Admin</h1>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-gray-500 hover:text-gray-900">
                Data
              </Link>
              <span className="text-gray-900 font-medium">Notifications</span>
              <Link href="/admin/screenings" className="text-gray-500 hover:text-gray-900">
                Screenings
              </Link>
            </nav>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">
            All notifications sent by LetSorted. Add new entries to{' '}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">lib/notifications/registry.ts</code>
          </p>
          <div className="flex gap-2 mt-3">
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
              {liveCount} live
            </span>
            <span className="text-gray-400">&middot;</span>
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
              {notStartedCount} not started
            </span>
            <span className="text-gray-400">&middot;</span>
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
              {comingSoonCount} coming soon
            </span>
          </div>
        </div>

        {/* Event-triggered */}
        <NotificationSection title="Event-triggered" notifications={eventNotifications} />

        {/* Cron-triggered */}
        <NotificationSection title="Cron-triggered" notifications={cronNotifications} />
      </div>
    </div>
  )
}

function NotificationSection({
  title,
  notifications,
}: {
  title: string
  notifications: NotificationDefinition[]
}) {
  const landlordNotifications = notifications.filter((n) => n.recipient === 'landlord')
  const tenantNotifications = notifications.filter((n) => n.recipient === 'tenant')
  const bothNotifications = notifications.filter((n) => n.recipient === 'both')

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
        {title}
      </h3>

      {landlordNotifications.length > 0 && (
        <NotificationTable label="Landlord" notifications={landlordNotifications} />
      )}
      {tenantNotifications.length > 0 && (
        <NotificationTable label="Tenant" notifications={tenantNotifications} />
      )}
      {bothNotifications.length > 0 && (
        <NotificationTable label="Both" notifications={bothNotifications} />
      )}
    </div>
  )
}

function NotificationTable({
  label,
  notifications,
}: {
  label: string
  notifications: NotificationDefinition[]
}) {
  return (
    <div className="mb-6">
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </h4>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Recipient
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Template
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {notifications.map((n) => (
              <tr key={n.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {n.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{n.description}</td>
                <td className="px-4 py-3 text-sm text-gray-600 capitalize whitespace-nowrap">
                  {n.recipient}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[n.status]}`}
                  >
                    {STATUS_LABEL[n.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono whitespace-nowrap">
                  {n.templateFn || '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
