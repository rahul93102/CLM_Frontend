'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/auth-context'
import AuthCardShell from '@/app/components/AuthCardShell'
import { APIError } from '@/app/lib/api'
import GoogleSignInButton from '@/app/components/GoogleSignInButton'

export default function LoginPage() {
  const router = useRouter()
  const { login, loginWithGoogle, isLoading, error, clearError, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    return () => {
      clearError()
    }
  }, [clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!email || !password) {
      setLocalError('Please enter your email and password')
      return
    }

    try {
      await login(email, password)
    } catch (err: any) {
      if (err instanceof APIError && err.status === 403 && err.data?.pending_verification) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}&type=login`)
        return
      }
      setLocalError(error || 'Login failed. Please try again.')
    }
  }

  const displayError = localError || error
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  return (
    <AuthCardShell title="Welcome Back" subtitle="Access your private vault securely" activeTab="login">
      {displayError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{displayError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M3 6.5l7 5 7-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 6h12a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#ff6f8a]"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-xs font-semibold text-gray-700">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold text-[#ff5aa0] hover:underline">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M6 9V7a4 4 0 118 0v2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M5 9h10a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#ff6f8a]"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
            disabled={isLoading}
          />
          Remember me for 30 days
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-1 w-full rounded-xl bg-gradient-to-r from-[#ff8a7a] via-[#ff6f8a] to-[#ff5aa0] py-3.5 text-sm font-semibold text-white shadow-[0_12px_25px_-12px_rgba(255,90,160,0.6)] hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign in to Vault →'}
        </button>
      </form>

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <div className="text-[10px] font-semibold tracking-widest text-gray-300">OR CONTINUE WITH</div>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        {!googleClientId ? (
          <p className="mt-3 text-center text-[11px] text-gray-400">
            Set <span className="font-semibold">NEXT_PUBLIC_GOOGLE_CLIENT_ID</span> to enable Google sign-in.
          </p>
        ) : null}

        <div className="mt-4 flex justify-center">
          <GoogleSignInButton
            clientId={googleClientId}
            disabled={isLoading || googleBusy}
            onCredential={async (credential) => {
              setLocalError('')
              setGoogleBusy(true)
              try {
                await loginWithGoogle(credential)
                router.replace('/dashboard')
              } finally {
                setGoogleBusy(false)
              }
            }}
            onError={(msg) => setLocalError(msg)}
          />
        </div>

        {googleBusy && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
            Authenticating with Google…
          </div>
        )}
      </div>
    </AuthCardShell>
  )
}
