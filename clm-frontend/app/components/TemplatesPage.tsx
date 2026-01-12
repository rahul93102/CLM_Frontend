'use client'

import { useEffect, useState } from 'react'
import { apiClient, ContractTemplate } from '@/app/lib/api-client'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    contract_type: '',
    description: '',
    r2_key: '',
    merge_fields: '',
    status: 'draft',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getTemplates()

      if (response.success) {
        const data = response.data as any
        const templatesList = Array.isArray(data) ? data : data.results || []
        setTemplates(templatesList)
      } else {
        setError(response.error || 'Failed to fetch templates')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const response = await apiClient.createTemplate({
        name: formData.name,
        contract_type: formData.contract_type,
        description: formData.description,
        r2_key: formData.r2_key,
        merge_fields: formData.merge_fields.split(',').map((f) => f.trim()).filter(Boolean),
        status: formData.status,
      })

      if (response.success) {
        setShowCreateModal(false)
        setFormData({
          name: '',
          contract_type: '',
          description: '',
          r2_key: '',
          merge_fields: '',
          status: 'draft',
        })
        await fetchTemplates()
      } else {
        setError(response.error || 'Failed to create template')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        const response = await apiClient.deleteTemplate(id)
        if (response.success) {
          await fetchTemplates()
        } else {
          setError(response.error || 'Failed to delete template')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contract Templates</h1>
          <p className="text-gray-600">Manage reusable contract templates</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
          >
            + New Template
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-lg text-gray-600">No templates found</p>
              <p className="text-sm text-gray-500 mt-1">Click "New Template" to create one</p>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Type</p>
                    <p className="text-sm text-gray-900">{template.contract_type}</p>
                  </div>
                  {template.merge_fields && template.merge_fields.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Merge Fields</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.merge_fields.map((field) => (
                          <span key={field} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Template</h2>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                    placeholder="e.g., NDA Template"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Type
                  </label>
                  <select
                    required
                    value={formData.contract_type}
                    onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  >
                    <option value="">Select type</option>
                    <option value="NDA">NDA</option>
                    <option value="Service Agreement">Service Agreement</option>
                    <option value="Purchase Agreement">Purchase Agreement</option>
                    <option value="Employment">Employment</option>
                    <option value="License">License</option>
                  </select>
                </div>
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
                  placeholder="Template description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  R2 Key (Document Storage)
                </label>
                <input
                  type="text"
                  value={formData.r2_key}
                  onChange={(e) => setFormData({ ...formData, r2_key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  placeholder="templates/nda-template.docx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merge Fields (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.merge_fields}
                  onChange={(e) => setFormData({ ...formData, merge_fields: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  placeholder="company_name, date, parties"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Template'}
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
