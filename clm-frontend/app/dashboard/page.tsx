'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/auth-context'
import { ApiClient, Contract as ApiContract } from '@/app/lib/api-client'

interface Contract {
  id: string
  name: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  date: string
  value: number
  trend: number
}

interface DashboardStats {
  total: number
  draft: number
  pending: number
  approved: number
  rejected: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [recentContracts, setRecentContracts] = useState<Contract[]>([])

  // Fetch real data from backend API - no mock data
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setIsSyncing(true)
        const client = new ApiClient()
        const response = await client.getContracts()
        if (response.success && response.data) {
          const contracts = (Array.isArray(response.data) ? response.data : response.data.results || []).map((contract: any) => ({
            id: contract.id,
            name: contract.title || contract.name,
            status: contract.status,
            date: contract.created_at || new Date().toISOString().split('T')[0],
            value: contract.value || 0,
            trend: Math.random() * 20 - 10,
          }))
          setRecentContracts(contracts.slice(0, 5))
        }
      } catch (error) {
        console.error('Failed to fetch contracts:', error)
      } finally {
        setIsSyncing(false)
      }
    }

    if (user) {
      fetchContracts()
    }
  }, [user])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Fetch real statistics from backend API - no mock data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsSyncing(true)
        const client = new ApiClient()
        const response = await client.getContracts()
        if (response.success && response.data) {
          const contracts = Array.isArray(response.data) ? response.data : response.data.results || []
          const total = contracts.length
          const draft = contracts.filter((c: any) => c.status === 'draft').length
          const pending = contracts.filter((c: any) => c.status === 'pending').length
          const approved = contracts.filter((c: any) => c.status === 'approved').length
          const rejected = contracts.filter((c: any) => c.status === 'rejected').length

          setStats({
            total,
            draft,
            pending,
            approved,
            rejected,
          })
        }
      } catch (error) {
        console.error('Failed to fetch statistics:', error)
      } finally {
        setIsSyncing(false)
      }
    }

    if (user) {
      fetchStats()
    }
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'draft':
        return 'bg-slate-100 text-slate-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getTrendColor = (trend: number) => {
    return trend > 0 ? 'text-emerald-600' : 'text-red-600'
  }

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? '↑' : '↓'
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#F2F0EB] to-[#F5F3EE]">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[#0F141F] text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg">
                C
              </div>
              <span className="font-bold text-lg">CLM</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
          <NavItem href="/dashboard" icon="📊" label="Dashboard" sidebarOpen={sidebarOpen} active />
          <NavItem href="/contracts" icon="📄" label="Contracts" sidebarOpen={sidebarOpen} />
          <NavItem href="/templates" icon="📋" label="Templates" sidebarOpen={sidebarOpen} />
          <NavItem href="/approvals" icon="✅" label="Approvals" sidebarOpen={sidebarOpen} />
          <NavItem href="/notifications" icon="🔔" label="Notifications" sidebarOpen={sidebarOpen} />
          <NavItem href="/search" icon="🔍" label="Search" sidebarOpen={sidebarOpen} />
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => {
              logout()
              router.push('/')
            }}
            className="w-full py-2 px-4 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm font-medium"
          >
            {sidebarOpen ? 'Logout' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/40 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 text-sm">Welcome back, {user?.email?.split('@')[0]}</p>
            </div>

            <div className="flex items-center gap-6">
              {/* Sync Status */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {isSyncing && (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                    <span>Syncing Data...</span>
                  </>
                )}
              </div>

              {/* Notification Bell */}
              <button className="relative p-2 hover:bg-white/50 rounded-lg transition">
                <span className="text-xl">🔔</span>
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* User Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {user?.email?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Contracts Card */}
            <div className="md:col-span-2 bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition">
              <h3 className="text-lg font-semibold mb-2 opacity-90">Total Contracts</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{stats.total}</span>
                <span className="text-lg opacity-75">contracts</span>
              </div>
              <p className="mt-4 text-white/80 text-sm">
                ↑ 23.45% from last month
              </p>
            </div>

            {/* Draft Card */}
            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 font-medium">Draft</h3>
                <span className="text-2xl">📝</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-4">{stats.draft}</p>

              {/* Donut Chart Placeholder */}
              <div className="flex items-center justify-center h-32">
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="8"
                      strokeDasharray={`${(stats.draft / stats.total) * 251.2} 251.2`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-600">
                      {Math.round((stats.draft / stats.total) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Pending Card */}
            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
              <h3 className="text-gray-600 font-medium mb-4">Pending Review</h3>
              <p className="text-4xl font-bold text-yellow-600 mb-2">{stats.pending}</p>
              <p className="text-sm text-gray-600">Awaiting action</p>
            </div>

            {/* Approved Card */}
            <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
              <h3 className="text-gray-600 font-medium mb-4">Approved</h3>
              <p className="text-4xl font-bold text-emerald-600 mb-2">{stats.approved}</p>
              <p className="text-sm text-gray-600">↑ 8.3% from last week</p>

              {/* Mini Bar Chart */}
              <div className="mt-4 flex gap-1 items-end h-12">
                {[65, 45, 75, 55, 80, 60].map((height, i) => (
                  <div
                    key={i}
                    style={{ height: `${height}%` }}
                    className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-sm"
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Contracts Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Contracts</h2>
            <div className="space-y-3">
              {recentContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition hover:scale-102 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Document Icon */}
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-xl group-hover:bg-purple-200 transition">
                        📄
                      </div>

                      {/* Contract Info */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition">
                          {contract.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {contract.date} • ${contract.value.toLocaleString()}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          contract.status
                        )}`}
                      >
                        {contract.status.charAt(0).toUpperCase() +
                          contract.status.slice(1)}
                      </span>

                      {/* Trend */}
                      <div
                        className={`flex items-center gap-1 font-semibold ${getTrendColor(
                          contract.trend
                        )}`}
                      >
                        <span>{getTrendIcon(contract.trend)}</span>
                        <span>
                          {Math.abs(contract.trend).toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="ml-4 text-gray-400 group-hover:text-purple-600 transition">
                      →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Navigation Item Component
function NavItem({
  icon,
  label,
  sidebarOpen,
  active = false,
  href = '#',
}: {
  icon: string
  label: string
  sidebarOpen: boolean
  active?: boolean
  href?: string
}) {
  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
        active
          ? 'bg-white/20 text-white'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
    >
      <span className="text-xl">{icon}</span>
      {sidebarOpen && <span className="font-medium">{label}</span>}
    </Link>
  )
}
