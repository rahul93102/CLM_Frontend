'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/auth-context'
import AuthCardShell from '@/app/components/AuthCardShell'
import GoogleSignInButton from '@/app/components/GoogleSignInButton'

export default function RegisterPage() {
  const router = useRouter()
  const { register, loginWithGoogle, isLoading, error, clearError, isAuthenticated } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [googleBusy, setGoogleBusy] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  // Clear error on unmount
  useEffect(() => {
    return () => {
      clearError()
    }
  }, [clearError])

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0)
      return
    }

    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*]/.test(password)) strength++

    setPasswordStrength(strength)
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      setLocalError('Please fill in all required fields')
      return
    }

    if (fullName.trim().length < 2) {
      setLocalError('Please enter your full name')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Please enter a valid email address')
      return
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (passwordStrength < 2) {
      setLocalError('Password is too weak. Please use uppercase, lowercase, and numbers.')
      return
    }

    try {
      await register({ email, password, full_name: fullName, company: company.trim() ? company : undefined })
      // Redirect to OTP verification page
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&type=email`)
    } catch (err: any) {
      const serverError = err?.message || error

      // Check for specific errors
      if (serverError?.includes('already') || serverError?.includes('exists')) {
        setLocalError('Email is already registered. Please log in instead.')
      } else if (serverError?.includes('invalid')) {
        setLocalError('Invalid email or password format')
      } else {
        setLocalError(serverError || 'Registration failed. Please try again.')
      }
    }
  }

  const displayError = localError || error
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const strengthColor =
    passwordStrength === 0
      ? 'bg-gray-300'
      : passwordStrength === 1
        ? 'bg-red-500'
        : passwordStrength === 2
          ? 'bg-yellow-500'
          : passwordStrength === 3
            ? 'bg-orange-500'
            : 'bg-green-500'

  const strengthText =
    passwordStrength === 0
      ? ''
      : passwordStrength === 1
        ? 'Weak'
        : passwordStrength === 2
          ? 'Fair'
          : passwordStrength === 3
            ? 'Good'
            : 'Strong'

  return (
    <AuthCardShell title="Create your account" subtitle="Start securely managing contracts" activeTab="register">
      {displayError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-800">{displayError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-xs font-semibold text-gray-700 mb-2">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm7 8c0-3.3-3.1-6-7-6s-7 2.7-7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-xl border border-black/15 bg-white px-10 py-3 text-sm font-semibold text-black placeholder:text-black/35 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
              disabled={isLoading}
              autoComplete="name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 6.5l7 5 7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 6h12a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-xl border border-black/15 bg-white px-10 py-3 text-sm font-semibold text-black placeholder:text-black/35 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
              disabled={isLoading}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="company" className="block text-xs font-semibold text-gray-700 mb-2">
            Company (optional)
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 8l7-4 7 4v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M7 18v-6h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="w-full rounded-xl border border-black/15 bg-white px-10 py-3 text-sm font-semibold text-black placeholder:text-black/35 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
              disabled={isLoading}
              autoComplete="organization"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M6 9V7a4 4 0 118 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M5 9h10a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-black/15 bg-white px-10 py-3 text-sm font-semibold text-black placeholder:text-black/35 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          {password ? (
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-gray-400">Strength</div>
                <div className="text-[11px] font-semibold text-gray-400">{strengthText}</div>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full transition-all duration-300 ${strengthColor}`}
                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-semibold text-black placeholder:text-black/35 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-1 w-full rounded-xl bg-black py-3.5 text-sm font-bold text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)] hover:bg-black/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-blue-700 hover:underline">
          Login
        </Link>
      </p>

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10" />
          <div className="text-[10px] font-black tracking-widest text-black/35">OR CONTINUE WITH</div>
          <div className="h-px flex-1 bg-black/10" />
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

