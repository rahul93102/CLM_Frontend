'use client'

import { useEffect, useState } from 'react'
import { apiClient, Contract } from '@/app/lib/api-client'
import Link from 'next/link'

interface ContractStats {
  total: number
  draft: number
  pending: number
  approved: number
  rejected: number
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [stats, setStats] = useState<ContractStats>({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'draft' as const,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch contracts from real API
  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getContracts()

      if (response.success) {
        const data = response.data as any
        const contractsList = Array.isArray(data) ? data : data.results || []
        setContracts(contractsList)

        // Calculate stats from real data
        const newStats = {
          total: contractsList.length,
          draft: contractsList.filter((c: any) => c.status === 'draft').length,
          pending: contractsList.filter((c: any) => c.status === 'pending').length,
          approved: contractsList.filter((c: any) => c.status === 'approved').length,
          rejected: contractsList.filter((c: any) => c.status === 'rejected').length,
        }
        setStats(newStats)
      } else {
        setError(response.error || 'Failed to fetch contracts')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const response = await apiClient.createContract({
        title: formData.title,
        description: formData.description,
        status: formData.status,
      })

      if (response.success) {
        setShowCreateModal(false)
        setFormData({ title: '', description: '', status: 'draft' })
        await fetchContracts()
      } else {
        setError(response.error || 'Failed to create contract')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteContract = async (id: string) => {
    if (confirm('Are you sure you want to delete this contract?')) {
      try {
        const response = await apiClient.deleteContract(id)
        if (response.success) {
          await fetchContracts()
        } else {
          setError(response.error || 'Failed to delete contract')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contracts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contracts</h1>
          <p className="text-gray-600">Manage and track all your contracts</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-gray-600 text-sm font-medium">Total</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-gray-600 text-sm font-medium">Draft</p>
            <p className="text-3xl font-bold text-slate-700 mt-2">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-gray-600 text-sm font-medium">Pending</p>
            <p className="text-3xl font-bold text-amber-700 mt-2">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-gray-600 text-sm font-medium">Approved</p>
            <p className="text-3xl font-bold text-emerald-700 mt-2">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-gray-600 text-sm font-medium">Rejected</p>
            <p className="text-3xl font-bold text-red-700 mt-2">{stats.rejected}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
          >
            + New Contract
          </button>
          <button
            onClick={() => fetchContracts()}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition font-medium border border-gray-200"
          >
            Refresh
          </button>
        </div>

        {/* Contracts Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {contracts.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="text-lg">No contracts found</p>
              <p className="text-sm mt-1">Click "New Contract" to create your first contract</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Title</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Created</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <Link href={`/contracts/editor?id=${encodeURIComponent(contract.id)}`} className="text-purple-600 hover:text-purple-700 font-medium">
                        {contract.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(contract.status)}`}>
                        {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(contract.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleDeleteContract(contract.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Contract</h2>

            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  placeholder="e.g., Service Agreement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="Contract description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Contract'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
