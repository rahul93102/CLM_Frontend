// API Service - Centralized API Management
const BASE_URL = 'https://clm-backend-y5ta.onrender.com/api';

// Token Management
export const tokenManager = {
  getAccessToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },
  
  getRefreshToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  },
  
  setTokens: (access: string, refresh: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }
  },
  
  setUser: (user: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },
  
  getUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },
  
  clearTokens: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },
};

// Request Helper with Auto Token Refresh
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = tokenManager.getAccessToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401 && tokenManager.getRefreshToken()) {
      const refreshToken = tokenManager.getRefreshToken();
      const refreshResponse = await fetch(`${BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshResponse.ok) {
        const { access, refresh } = await refreshResponse.json();
        tokenManager.setTokens(access, refresh);
        
        // Retry original request with new token
        headers.Authorization = `Bearer ${access}`;
        const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
        
        return retryResponse;
      } else {
        // Refresh failed, logout user
        tokenManager.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        throw new Error('Session expired');
      }
    }

    return response;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// Authentication APIs
export const authAPI = {
  // POST /api/auth/register/
  register: async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    const response = await apiRequest('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }
    
    const result = await response.json();
    tokenManager.setTokens(result.access, result.refresh);
    tokenManager.setUser(result.user);
    return result;
  },

  // POST /api/auth/login/
  login: async (data: { email: string; password: string }) => {
    const response = await apiRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    
    const result = await response.json();
    tokenManager.setTokens(result.access, result.refresh);
    tokenManager.setUser(result.user);
    return result;
  },

  // POST /api/auth/forgot-password/
  forgotPassword: async (email: string) => {
    const response = await apiRequest('/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send reset link');
    }
    
    return await response.json();
  },

  // POST /api/auth/reset-password/
  resetPassword: async (data: { token: string; password: string }) => {
    const response = await apiRequest('/auth/reset-password/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to reset password');
    }
    
    return await response.json();
  },

  logout: () => {
    tokenManager.clearTokens();
  },
};

// Contract APIs
export const contractAPI = {
  // GET /api/contracts/statistics/
  getStatistics: async () => {
    const response = await apiRequest('/contracts/statistics/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }
    
    return await response.json();
  },

  // GET /api/contracts/recent/
  getRecentContracts: async () => {
    const response = await apiRequest('/contracts/recent/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch recent contracts');
    }
    
    return await response.json();
  },

  // POST /api/contracts/validate-clauses/
  validateClauses: async (clauses: any[]) => {
    const response = await apiRequest('/contracts/validate-clauses/', {
      method: 'POST',
      body: JSON.stringify({ clauses }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to validate clauses');
    }
    
    return await response.json();
  },
};

// Template APIs
export const templateAPI = {
  // GET /api/contract-templates/
  getTemplates: async () => {
    const response = await apiRequest('/contract-templates/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    
    return await response.json();
  },
};

// Clause APIs
export const clauseAPI = {
  // GET /api/clauses/
  getClauses: async () => {
    const response = await apiRequest('/clauses/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch clauses');
    }
    
    return await response.json();
  },
};

// Generation Job APIs
export const jobAPI = {
  // GET /api/generation-jobs/
  getJobs: async () => {
    const response = await apiRequest('/generation-jobs/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch generation jobs');
    }
    
    return await response.json();
  },
};

// Features API
export const featuresAPI = {
  // GET /api/
  getFeatures: async () => {
    const response = await apiRequest('/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch features');
    }
    
    return await response.json();
  },
};

export default {
  auth: authAPI,
  contract: contractAPI,
  template: templateAPI,
  clause: clauseAPI,
  job: jobAPI,
  features: featuresAPI,
  tokenManager,
};
