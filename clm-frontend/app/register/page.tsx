'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/lib/auth-context'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, error, clearError, isAuthenticated } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)

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
      setLocalError('Please fill in all fields')
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
      await register(email, password, fullName)
      // Redirect to OTP verification page
      router.push(`/verify-otp?email=${encodeURIComponent(email)}&type=email`)
    } catch (err) {
      const serverError = error

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
    <div className="min-h-screen flex">
      {/* Left Side - Gradient with animated blobs (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 relative overflow-hidden items-center justify-center">
        {/* Animated blobs */}
        <style>{`
          @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .blob {
            animation: blob 7s infinite;
          }
          .blob1 { animation-delay: 0s; }
          .blob2 { animation-delay: 2s; }
          .blob3 { animation-delay: 4s; }
        `}</style>

        <div className="absolute w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60 blob blob1"></div>
        <div className="absolute w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60 blob blob2 -bottom-8 -left-8"></div>
        <div className="absolute w-72 h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60 blob blob3 -right-8 -bottom-8"></div>

        {/* Branding text */}
        <div className="relative z-10 text-center text-white px-8">
          <h1 className="text-5xl font-bold mb-4">Welcome to CLM</h1>
          <p className="text-lg text-white/90">
            Contract Lifecycle Management made simple. Streamline your contract workflows, track approvals, and maintain compliance with our intelligent platform.
          </p>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full md:w-1/2 bg-white flex flex-col items-center justify-center px-6 md:px-12">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">C</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-600 mb-8">Sign up to get started with CLM</p>

          {/* Error message */}
          {displayError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name input */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
            </div>

            {/* Email input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Strength</span>
                    <span className="text-xs font-medium text-gray-600">{strengthText}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
            </div>

            {/* Sign up button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-8 text-center text-gray-700">
            Already have an account?{' '}
            <Link href="/" className="text-purple-600 hover:text-purple-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-12 text-xs text-gray-500">© 2026 CLM System. All rights reserved.</p>
      </div>
    </div>
  )
}
