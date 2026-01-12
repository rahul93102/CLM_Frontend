'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
  tokenManager,
  User,
  APIError,
} from './api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<{ email: string; requiresOTP: boolean }>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = tokenManager.getUser()
        const accessToken = tokenManager.getAccessToken()

        if (storedUser && accessToken) {
          // Check if token is expired
          if (!tokenManager.isTokenExpired(accessToken)) {
            setUser(storedUser)
          } else {
            // Try to refresh token
            const refreshToken = tokenManager.getRefreshToken()
            if (refreshToken) {
              try {
                const response = await refreshAccessToken(refreshToken)
                tokenManager.setTokens(response.access, response.refresh)
                tokenManager.setUser(response.user)
                setUser(response.user)
              } catch (err) {
                // Refresh failed, clear auth
                tokenManager.clearTokens()
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await loginUser({ email, password })
      tokenManager.setTokens(response.access, response.refresh)
      tokenManager.setUser(response.user)
      setUser(response.user)
    } catch (err) {
      const errorMessage =
        err instanceof APIError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Login failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await registerUser({ email, password, full_name: fullName })
        // Don't set tokens yet - user needs to verify OTP first
        // Just store email for OTP verification page
        localStorage.setItem('pending_email', email)
        localStorage.setItem('pending_otp_type', 'email')
        // Return email so component knows to redirect to OTP page
        return { email, requiresOTP: true }
      } catch (err) {
        const errorMessage =
          err instanceof APIError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Registration failed'
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const logout = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const accessToken = tokenManager.getAccessToken()
      if (accessToken) {
        await logoutUser(accessToken)
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      tokenManager.clearTokens()
      setUser(null)
      setIsLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    register,
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
