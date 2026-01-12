'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/app/lib/api'

export default function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const email = searchParams?.get('email') || ''
  const otpFromUrl = searchParams?.get('otp') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

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
    setError('')

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (passwordStrength < 2) {
      setError('Password is too weak. Please use uppercase, lowercase, and numbers.')
      return
    }

    setIsLoading(true)

    try {
      await resetPassword({
        email,
        otp: otpFromUrl,
        password,
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const strengthColor =
    passwordStrength === 0
      ? 'bg-gray-300'
      : passwordStrength === 1
        ? 'bg-red-500'
        : passwordStrength === 2
          ? 'bg-yellow-500'
          : passwordStrength === 3
            ? 'bg-blue-500'
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
    <div className="flex h-screen bg-white">
      {/* Left Panel - Gradient */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 relative overflow-hidden flex-col justify-between p-12">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-300 opacity-10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-300 opacity-10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>

        {/* Content */}
        <div className="relative z-10">
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
            Welcome to CLM
          </h1>
          <p className="text-xl text-white/80 leading-relaxed max-w-md">
            Contract Lifecycle Management made simple. Streamline your contract workflows, track approvals, and maintain compliance with our intelligent platform.
          </p>
        </div>

        {/* Glassmorphism Badge */}
        <div className="relative z-10 inline-flex items-center px-6 py-3 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-white">
          <div className="w-2 h-2 rounded-full bg-green-400 mr-3"></div>
          <span className="text-sm font-medium">System Operational</span>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 sm:px-12 lg:px-12">
        <div className="w-full max-w-md">
          {/* Logo for Mobile */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Create New Password
            </h2>
            <p className="text-gray-600">
              Enter a strong password to secure your account.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-600">
                ✓ Password reset successfully! Redirecting to login...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                disabled={isLoading || success}
              />

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">Password Strength</span>
                    {strengthText && (
                      <span
                        className={`text-xs font-medium ${
                          passwordStrength === 1
                            ? 'text-red-500'
                            : passwordStrength === 2
                              ? 'text-yellow-500'
                              : passwordStrength === 3
                                ? 'text-blue-500'
                                : 'text-green-500'
                        }`}
                      >
                        {strengthText}
                      </span>
                    )}
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strengthColor} transition-all duration-300`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Must contain 8+ characters, uppercase, lowercase, numbers
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                disabled={isLoading || success}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:shadow-lg hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {success
                ? 'Password Reset ✓'
                : isLoading
                  ? 'Resetting...'
                  : 'Reset Password'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-pink-600 hover:text-pink-700 transition"
            >
              Back to login
            </Link>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-500">
            © 2026 CLM System. All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
