'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/auth-context'
import { ApiClient, Contract } from '@/app/lib/api-client'

const statusColors = {
  draft: 'bg-slate-100 text-slate-800',
  in_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  signed: 'bg-blue-100 text-blue-800',
}

const statusBgDots = {
  draft: 'bg-slate-400',
  in_review: 'bg-amber-400',
  approved: 'bg-emerald-400',
  signed: 'bg-blue-400',
}

export default function ContractsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const [contracts, setContracts] = useState<Contract[]>([])
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sortBy, setSortBy] = useState('date')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Load contracts
  useEffect(() => {
    const loadContracts = async () => {
      try {
        const client = new ApiClient()
        const response = await client.getContracts()
        
        // Handle nested data structure (response.data.data or just response.data)
        let contractsList: Contract[] = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            contractsList = response.data
          } else if ((response.data as any)?.data && Array.isArray((response.data as any).data)) {
            contractsList = (response.data as any).data
          }
        }
        
        setContracts(contractsList || [])
      } catch (error) {
        console.error('Failed to load contracts:', error)
        setContracts([])
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      loadContracts()
    }
  }, [isAuthenticated, router])

  // Filter and search
  useEffect(() => {
    let filtered = [...contracts]

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((c) => c.status === filterStatus)
    }

    // Search by title
    if (searchQuery) {
      filtered = filtered.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'value') {
      filtered.sort((a, b) => (b.value || 0) - (a.value || 0))
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title))
    }

    setFilteredContracts(filtered)
  }, [contracts, searchQuery, filterStatus, sortBy])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 z-50 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between border-b border-slate-700">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center font-bold text-lg">
              C
            </div>
            {sidebarOpen && <span className="font-bold text-xl">CLM</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-slate-700 transition"
          >
            <span className="text-xl">📊</span>
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <div className="px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center gap-4">
            <span className="text-xl">📄</span>
            {sidebarOpen && <span>Contracts</span>}
          </div>
          <Link
            href="/templates"
            className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-slate-700 transition"
          >
            <span className="text-xl">📋</span>
            {sidebarOpen && <span>Templates</span>}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-slate-700 transition"
          >
            <span className="text-xl">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-6 left-0 right-0 px-4">
          <button
            onClick={handleLogout}
            className={`w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center justify-center gap-2 ${
              !sidebarOpen && 'px-0'
            }`}
          >
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                {sidebarOpen ? '◀' : '▶'}
              </button>
              <h1 className="text-3xl font-bold text-slate-900">Contracts</h1>
              <span className="ml-4 text-sm font-medium text-slate-500">
                {filteredContracts.length} contracts
              </span>
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold text-slate-900">{user?.full_name || 'User'}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Filters & Search */}
        <div className="p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Contracts
                </label>
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />
              </div>

              {/* Filter Status */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="signed">Signed</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                >
                  <option value="date">Date (Newest)</option>
                  <option value="value">Value (Highest)</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>

              {/* Create Button */}
              <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition font-semibold whitespace-nowrap">
                + New Contract
              </button>
            </div>
          </div>

          {/* Contracts Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin text-2xl mb-4">⚙️</div>
                <p className="text-slate-600">Loading contracts...</p>
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-600 text-lg">No contracts found</p>
                <p className="text-slate-500 text-sm mt-2">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Counter Party
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Value
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredContracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{contract.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-600">{'-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          ${(contract.value || 0).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            statusColors[contract.status as keyof typeof statusColors] ||
                            statusColors.draft
                          }`}
                        >
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              statusBgDots[contract.status as keyof typeof statusBgDots] ||
                              statusBgDots.draft
                            }`}
                          ></span>
                          {contract.status.replace('_', ' ').charAt(0).toUpperCase() +
                            contract.status.slice(1).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-600 text-sm">
                          {new Date(contract.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition font-medium text-sm">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
