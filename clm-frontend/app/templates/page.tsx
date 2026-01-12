'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/auth-context'
import { ApiClient } from '@/app/lib/api-client'

interface Template {
  id: string
  name: string
  category: string
  description?: string
  created_at: string
  updated_at: string
  usage_count?: number
}

const categoryIcons = {
  'Sales Agreements': '🤝',
  'Employment': '👥',
  'NDAs': '🔒',
  'Service': '⚙️',
  'Procurement': '📦',
  'Legal': '⚖️',
  'Partnership': '🔗',
  'Other': '📄',
}

const categoryColors = {
  'Sales Agreements': 'from-blue-400 to-blue-600',
  'Employment': 'from-purple-400 to-purple-600',
  'NDAs': 'from-red-400 to-red-600',
  'Service': 'from-green-400 to-green-600',
  'Procurement': 'from-orange-400 to-orange-600',
  'Legal': 'from-indigo-400 to-indigo-600',
  'Partnership': 'from-pink-400 to-pink-600',
  'Other': 'from-gray-400 to-gray-600',
}

export default function TemplatesPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const client = new ApiClient()
        const response = await client.getTemplates()
        
        // Handle nested data structure (response.data.data or just response.data)
        let templatesList: Template[] = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            templatesList = response.data
          } else if ((response.data as any)?.data && Array.isArray((response.data as any).data)) {
            templatesList = (response.data as any).data
          }
        }
        
        setTemplates(templatesList || [])
      } catch (error) {
        console.error('Failed to load templates:', error)
        setTemplates([])
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      loadTemplates()
    }
  }, [isAuthenticated, router])

  // Filter and search
  useEffect(() => {
    let filtered = [...templates]

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory)
    }

    // Search by name
    if (searchQuery) {
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredTemplates(filtered)
  }, [templates, searchQuery, selectedCategory])

  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category)))]

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
          <Link
            href="/contracts"
            className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-slate-700 transition"
          >
            <span className="text-xl">📄</span>
            {sidebarOpen && <span>Contracts</span>}
          </Link>
          <div className="px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 flex items-center gap-4">
            <span className="text-xl">📋</span>
            {sidebarOpen && <span>Templates</span>}
          </div>
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
              <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
              <span className="ml-4 text-sm font-medium text-slate-500">
                {filteredTemplates.length} templates
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

        {/* Filters & Controls */}
        <div className="p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Templates
                </label>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-3 rounded-lg transition font-semibold ${
                    viewMode === 'grid'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-3 rounded-lg transition font-semibold ${
                    viewMode === 'list'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  List
                </button>
              </div>

              {/* Create Button */}
              <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition font-semibold whitespace-nowrap">
                + New Template
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-medium transition whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-purple-500 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {category === 'all' ? 'All Templates' : category}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin text-2xl mb-4">⚙️</div>
              <p className="text-slate-600">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
              <p className="text-slate-600 text-lg">No templates found</p>
              <p className="text-slate-500 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition cursor-pointer group"
                >
                  {/* Category Header */}
                  <div
                    className={`h-24 bg-gradient-to-br ${
                      categoryColors[template.category as keyof typeof categoryColors] ||
                      categoryColors['Other']
                    } flex items-center justify-center text-4xl group-hover:scale-110 transition`}
                  >
                    {
                      categoryIcons[template.category as keyof typeof categoryIcons] ||
                      categoryIcons['Other']
                    }
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{template.name}</h3>
                    <p className="text-slate-600 text-sm mb-4">
                      {template.description || 'No description provided'}
                    </p>

                    {/* Category Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                        {template.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        Used {template.usage_count || 0} times
                      </span>
                    </div>

                    {/* Button */}
                    <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition font-semibold">
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Template Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Last Updated
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Usage
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTemplates.map((template) => (
                    <tr
                      key={template.id}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{template.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                          {template.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-600 text-sm">
                          {new Date(template.updated_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {template.usage_count || 0} times
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition font-medium text-sm">
                          Use Template
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Mock data
const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Standard NDA',
    category: 'NDAs',
    description: 'Mutual Non-Disclosure Agreement for general business use',
    created_at: '2025-12-01',
    updated_at: '2026-01-10',
    usage_count: 45,
  },
  {
    id: '2',
    name: 'Employment Contract',
    category: 'Employment',
    description: 'Full-time employment agreement with benefits and terms',
    created_at: '2025-11-15',
    updated_at: '2026-01-09',
    usage_count: 28,
  },
  {
    id: '3',
    name: 'Sales Agreement',
    category: 'Sales Agreements',
    description: 'B2B sales contract with payment and delivery terms',
    created_at: '2025-10-20',
    updated_at: '2026-01-12',
    usage_count: 67,
  },
  {
    id: '4',
    name: 'Service Level Agreement',
    category: 'Service',
    description: 'SLA template for service delivery and support',
    created_at: '2025-10-05',
    updated_at: '2026-01-08',
    usage_count: 34,
  },
  {
    id: '5',
    name: 'Purchase Order',
    category: 'Procurement',
    description: 'Standard purchase order template',
    created_at: '2025-09-18',
    updated_at: '2026-01-07',
    usage_count: 89,
  },
  {
    id: '6',
    name: 'Partnership Agreement',
    category: 'Partnership',
    description: 'Business partnership agreement template',
    created_at: '2025-09-01',
    updated_at: '2026-01-05',
    usage_count: 12,
  },
]
