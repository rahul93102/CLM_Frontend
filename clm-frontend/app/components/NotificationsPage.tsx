'use client'

import { useEffect, useState } from 'react'
import { apiClient, Notification } from '@/app/lib/api-client'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    fetchNotifications()
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getNotifications()

      if (response.success) {
        const data = response.data as any
        const notificationsList = Array.isArray(data) ? data : data.results || []
        setNotifications(notificationsList)
      } else {
        setError(response.error || 'Failed to fetch notifications')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await apiClient.markNotificationAsRead(id)
      if (response.success) {
        await fetchNotifications()
      } else {
        setError(response.error || 'Failed to mark as read')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  const stats = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'approval_request':
        return 'bg-blue-100 text-blue-700'
      case 'approval_approved':
        return 'bg-emerald-100 text-emerald-700'
      case 'approval_rejected':
        return 'bg-red-100 text-red-700'
      case 'contract_created':
        return 'bg-purple-100 text-purple-700'
      case 'workflow_completed':
        return 'bg-indigo-100 text-indigo-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'approval_request':
        return '📋'
      case 'approval_approved':
        return '✅'
      case 'approval_rejected':
        return '❌'
      case 'contract_created':
        return '📄'
      case 'workflow_completed':
        return '🎉'
      default:
        return '📢'
    }
  }

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">Stay updated with your contract activities</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-gray-600 text-sm font-medium">Total Notifications</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-gray-600 text-sm font-medium">Unread</p>
            <p className="text-3xl font-bold text-amber-700 mt-2">{stats.unread}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Notifications ({stats.total})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'unread'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Unread ({stats.unread})
          </button>
          <button
            onClick={() => fetchNotifications()}
            className="ml-auto px-4 py-2 bg-white text-gray-900 rounded-lg border border-gray-200 hover:bg-gray-50 transition font-medium"
          >
            Refresh
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-4xl mb-2">🔔</div>
              <p className="text-lg text-gray-600">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-md p-4 transition ${
                  !notification.read ? 'border-l-4 border-purple-600' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl mt-1">{getTypeIcon(notification.type)}</div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-bold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.subject}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(notification.type)} whitespace-nowrap`}>
                        {notification.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{notification.message}</p>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>

                      <div className="flex gap-2">
                        {notification.action_url && (
                          <a
                            href={notification.action_url}
                            className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                          >
                            View →
                          </a>
                        )}
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-gray-600 hover:text-gray-900 font-medium text-sm"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
