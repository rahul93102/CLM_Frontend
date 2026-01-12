'use client'

import { useEffect, useState } from 'react'
import { apiClient, ApprovalRequest } from '@/app/lib/api-client'

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [formData, setFormData] = useState({
    entity_type: 'contract',
    entity_id: '',
    requester_id: '',
    status: 'pending',
    priority: 'normal',
    comment: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchApprovals()
  }, [])

  const fetchApprovals = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getApprovals()

      if (response.success) {
        const data = response.data as any
        const approvalsList = Array.isArray(data) ? data : data.results || []
        setApprovals(approvalsList)
      } else {
        setError(response.error || 'Failed to fetch approvals')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateApproval = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const response = await apiClient.createApproval({
        entity_type: formData.entity_type,
        entity_id: formData.entity_id,
        requester_id: formData.requester_id,
        status: (formData.status as 'pending' | 'approved' | 'rejected'),
        priority: (formData.priority as 'low' | 'normal' | 'high'),
        comment: formData.comment,
      })

      if (response.success) {
        setShowCreateModal(false)
        setFormData({
          entity_type: 'contract',
          entity_id: '',
          requester_id: '',
          status: 'pending',
          priority: 'normal',
          comment: '',
        })
        await fetchApprovals()
      } else {
        setError(response.error || 'Failed to create approval request')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (id: string, comment: string = '') => {
    try {
      const response = await apiClient.approveRequest(id, comment)
      if (response.success) {
        await fetchApprovals()
        setSelectedApproval(null)
      } else {
        setError(response.error || 'Failed to approve request')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleReject = async (id: string, reason: string = '') => {
    try {
      const response = await apiClient.rejectRequest(id, reason)
      if (response.success) {
        await fetchApprovals()
        setSelectedApproval(null)
      } else {
        setError(response.error || 'Failed to reject request')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700'
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'normal':
        return 'text-blue-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const stats = {
    total: approvals.length,
    pending: approvals.filter((a) => a.status === 'pending').length,
    approved: approvals.filter((a) => a.status === 'approved').length,
    rejected: approvals.filter((a) => a.status === 'rejected').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading approvals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Approvals</h1>
          <p className="text-gray-600">Manage contract approval requests</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <p className="text-gray-600 text-sm font-medium">Total</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
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

        {/* Action Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
          >
            + New Approval Request
          </button>
        </div>

        {/* Approvals List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {approvals.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="text-lg">No approval requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">Entity</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">Status</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">Priority</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">Created</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((approval) => (
                    <tr key={approval.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{approval.entity_type}</p>
                          <p className="text-sm text-gray-500">{approval.entity_id.slice(0, 12)}...</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(approval.status)}`}>
                          {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${getPriorityColor(approval.priority || 'normal')}`}>
                          {(approval.priority || 'normal').charAt(0).toUpperCase() + (approval.priority || 'normal').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(approval.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => setSelectedApproval(approval)}
                          className="text-purple-600 hover:text-purple-700 font-medium"
                        >
                          View
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Approval Request</h2>

            <form onSubmit={handleCreateApproval} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity Type
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  >
                    <option value="contract">Contract</option>
                    <option value="template">Template</option>
                    <option value="document">Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity ID
                </label>
                <input
                  type="text"
                  required
                  value={formData.entity_id}
                  onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  placeholder="Enter entity ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requester ID
                </label>
                <input
                  type="text"
                  required
                  value={formData.requester_id}
                  onChange={(e) => setFormData({ ...formData, requester_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  placeholder="Enter requester ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comment
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="Add comments..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Request'}
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

      {/* Detail Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Approval Details</h2>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 font-medium">Entity Type</p>
                <p className="text-lg text-gray-900">{selectedApproval.entity_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedApproval.status)}`}>
                  {selectedApproval.status.charAt(0).toUpperCase() + selectedApproval.status.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Priority</p>
                <p className={`text-lg font-semibold ${getPriorityColor(selectedApproval.priority || 'normal')}`}>
                  {(selectedApproval.priority || 'normal').charAt(0).toUpperCase() + (selectedApproval.priority || 'normal').slice(1)}
                </p>
              </div>
              {selectedApproval.comment && (
                <div>
                  <p className="text-sm text-gray-500 font-medium">Comment</p>
                  <p className="text-gray-700">{selectedApproval.comment}</p>
                </div>
              )}
            </div>

            {selectedApproval.status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(selectedApproval.id)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(selectedApproval.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Reject
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedApproval(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
