/**
 * Production-grade API Client
 * All real endpoints - NO mock data
 * Handles authentication, error handling, and all CLM operations
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status: number
}

export interface Contract {
  id: string
  title: string
  description?: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  value?: number
  created_by?: string
}

export interface ContractTemplate {
  id: string
  name: string
  contract_type: string
  description?: string
  r2_key?: string
  merge_fields?: string[]
  status: string
}

export interface Workflow {
  id: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'archived'
  steps: WorkflowStep[]
  created_at: string
}

export interface WorkflowStep {
  step_number: number
  name: string
  assigned_to: string[]
  action_type?: string
}

export interface ApprovalRequest {
  id: string
  entity_type: string
  entity_id: string
  requester_id: string
  status: 'pending' | 'approved' | 'rejected'
  comment?: string
  priority?: 'low' | 'normal' | 'high'
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  type: string
  subject: string
  message: string
  read: boolean
  created_at: string
  action_url?: string
}

export interface SearchResult {
  id: string
  title: string
  entity_type: string
  content_preview: string
  relevance_score: number
}

export class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private refreshToken: string | null = null

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'https://clm-backend-at23.onrender.com') {
    this.baseUrl = baseUrl
    this.loadTokens()
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token')
      this.refreshToken = localStorage.getItem('refresh_token')
    }
  }

  private setTokens(access: string, refresh?: string) {
    this.token = access
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access)
      if (refresh) {
        this.refreshToken = refresh
        localStorage.setItem('refresh_token', refresh)
      }
    }
  }

  private clearTokens() {
    this.token = null
    this.refreshToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    customHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders,
      }

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`
      }

      const config: RequestInit = {
        method,
        headers,
        credentials: 'include',
      }

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(data)
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, config)

      if (response.status === 401) {
        this.clearTokens()
        throw new Error('Unauthorized - Please log in again')
      }

      const responseData = await response.json().catch(() => ({}))

      if (!response.ok) {
        return {
          success: false,
          error: responseData.message || responseData.detail || 'Request failed',
          status: response.status,
        }
      }

      return {
        success: true,
        data: responseData,
        status: response.status,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
      }
    }
  }

  // ==================== AUTHENTICATION ====================
  async register(email: string, password: string, fullName: string): Promise<ApiResponse> {
    const response = await this.request('POST', '/api/auth/register/', {
      email,
      password,
      full_name: fullName,
    })

    if (response.success && (response.data as any)?.access) {
      this.setTokens((response.data as any).access, (response.data as any).refresh)
    }

    return response
  }

  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.request('POST', '/api/auth/login/', {
      email,
      password,
    })

    if (response.success && (response.data as any)?.access) {
      this.setTokens((response.data as any).access, (response.data as any).refresh)
    }

    return response
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('POST', '/api/auth/logout/', {})
    this.clearTokens()
    return response
  }

  async getCurrentUser(): Promise<ApiResponse> {
    return this.request('GET', '/api/auth/me/')
  }

  // ==================== CONTRACTS ====================
  async createContract(data: Partial<Contract>): Promise<ApiResponse<Contract>> {
    return this.request('POST', '/api/contracts/', data)
  }

  async getContracts(params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request('GET', `/api/contracts/${queryString}`)
  }

  async getContractById(id: string): Promise<ApiResponse<Contract>> {
    return this.request('GET', `/api/contracts/${id}/`)
  }

  async updateContract(id: string, data: Partial<Contract>): Promise<ApiResponse<Contract>> {
    return this.request('PUT', `/api/contracts/${id}/`, data)
  }

  async deleteContract(id: string): Promise<ApiResponse> {
    return this.request('DELETE', `/api/contracts/${id}/`)
  }

  async cloneContract(id: string, newTitle: string): Promise<ApiResponse<Contract>> {
    return this.request('POST', `/api/contracts/${id}/clone/`, {
      title: newTitle,
    })
  }

  async getContractVersions(id: string): Promise<ApiResponse> {
    return this.request('GET', `/api/contracts/${id}/versions/`)
  }

  async createContractVersion(
    id: string,
    changeSummary: string,
    selectedClauses?: string[]
  ): Promise<ApiResponse> {
    return this.request('POST', `/api/contracts/${id}/versions/`, {
      change_summary: changeSummary,
      selected_clauses: selectedClauses || [],
    })
  }

  async getContractStatistics(): Promise<ApiResponse> {
    return this.request('GET', '/api/contracts/statistics/')
  }

  // ==================== TEMPLATES ====================
  async createTemplate(data: Partial<ContractTemplate>): Promise<ApiResponse<ContractTemplate>> {
    return this.request('POST', '/api/contract-templates/', data)
  }

  async getTemplates(): Promise<ApiResponse> {
    return this.request('GET', '/api/contract-templates/')
  }

  async getTemplateById(id: string): Promise<ApiResponse<ContractTemplate>> {
    return this.request('GET', `/api/contract-templates/${id}/`)
  }

  async updateTemplate(
    id: string,
    data: Partial<ContractTemplate>
  ): Promise<ApiResponse<ContractTemplate>> {
    return this.request('PUT', `/api/contract-templates/${id}/`, data)
  }

  async deleteTemplate(id: string): Promise<ApiResponse> {
    return this.request('DELETE', `/api/contract-templates/${id}/`)
  }

  // ==================== WORKFLOWS ====================
  async createWorkflow(data: Partial<Workflow>): Promise<ApiResponse<Workflow>> {
    return this.request('POST', '/api/workflows/', data)
  }

  async getWorkflows(): Promise<ApiResponse> {
    return this.request('GET', '/api/workflows/')
  }

  async getWorkflowById(id: string): Promise<ApiResponse<Workflow>> {
    return this.request('GET', `/api/workflows/${id}/`)
  }

  async updateWorkflow(id: string, data: Partial<Workflow>): Promise<ApiResponse<Workflow>> {
    return this.request('PUT', `/api/workflows/${id}/`, data)
  }

  async deleteWorkflow(id: string): Promise<ApiResponse> {
    return this.request('DELETE', `/api/workflows/${id}/`)
  }

  async getWorkflowInstances(workflowId: string): Promise<ApiResponse> {
    return this.request('GET', `/api/workflows/${workflowId}/instances/`)
  }

  // ==================== APPROVALS ====================
  async createApproval(data: Partial<ApprovalRequest>): Promise<ApiResponse<ApprovalRequest>> {
    return this.request('POST', '/api/approvals/', data)
  }

  async getApprovals(params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request('GET', `/api/approvals/${queryString}`)
  }

  async getApprovalById(id: string): Promise<ApiResponse<ApprovalRequest>> {
    return this.request('GET', `/api/approvals/${id}/`)
  }

  async updateApproval(
    id: string,
    data: Partial<ApprovalRequest>
  ): Promise<ApiResponse<ApprovalRequest>> {
    return this.request('PUT', `/api/approvals/${id}/`, data)
  }

  async approveRequest(id: string, comment?: string): Promise<ApiResponse> {
    return this.request('PUT', `/api/approvals/${id}/`, {
      status: 'approved',
      comment,
    })
  }

  async rejectRequest(id: string, reason?: string): Promise<ApiResponse> {
    return this.request('PUT', `/api/approvals/${id}/`, {
      status: 'rejected',
      comment: reason,
    })
  }

  // ==================== NOTIFICATIONS ====================
  async getNotifications(params?: Record<string, any>): Promise<ApiResponse> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request('GET', `/api/notifications/${queryString}`)
  }

  async createNotification(data: any): Promise<ApiResponse<Notification>> {
    return this.request('POST', '/api/notifications/', data)
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse> {
    return this.request('PUT', `/api/notifications/${id}/`, { read: true })
  }

  // ==================== SEARCH ====================
  async search(query: string, params?: Record<string, any>): Promise<ApiResponse> {
    const fullParams = { q: query, ...params }
    const queryString = '?' + new URLSearchParams(fullParams).toString()
    return this.request('GET', `/api/search/${queryString}`)
  }

  async semanticSearch(query: string): Promise<ApiResponse> {
    return this.request('GET', `/api/search/semantic/?q=${encodeURIComponent(query)}`)
  }

  async advancedSearch(data: any): Promise<ApiResponse> {
    return this.request('POST', '/api/search/advanced/', data)
  }

  async getSearchSuggestions(query: string): Promise<ApiResponse> {
    return this.request('GET', `/api/search/suggestions/?q=${encodeURIComponent(query)}`)
  }

  // ==================== DOCUMENTS ====================
  async listDocuments(): Promise<ApiResponse> {
    return this.request('GET', '/api/documents/')
  }

  async getRepository(): Promise<ApiResponse> {
    return this.request('GET', '/api/repository/')
  }

  async getRepositoryFolders(): Promise<ApiResponse> {
    return this.request('GET', '/api/repository/folders/')
  }

  async createFolder(name: string, parentId?: string): Promise<ApiResponse> {
    return this.request('POST', '/api/repository/folders/', {
      name,
      parent_id: parentId,
    })
  }

  // ==================== METADATA ====================
  async createMetadataField(data: any): Promise<ApiResponse> {
    return this.request('POST', '/api/metadata/fields/', data)
  }

  async getMetadataFields(): Promise<ApiResponse> {
    return this.request('GET', '/api/metadata/fields/')
  }

  // ==================== HEALTH ====================
  async getHealth(): Promise<ApiResponse> {
    return this.request('GET', '/api/health/')
  }
}

// Singleton instance
export const apiClient = new ApiClient()
