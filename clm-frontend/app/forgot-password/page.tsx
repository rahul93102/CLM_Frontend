'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { requestPasswordReset } from '@/app/lib/api'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      await requestPasswordReset(email)
      setSuccess(true)
      setTimeout(() => {
        router.push(`/verify-otp?type=password-reset&email=${encodeURIComponent(email)}`)
      }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

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
              Reset Password
            </h2>
            <p className="text-gray-600">
              Enter your email address and we'll send you a code to reset your password.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-600">
                ✓ Check your email for the verification code!
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
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
                ? 'Code Sent ✓'
                : isLoading
                  ? 'Sending...'
                  : 'Send Reset Code'}
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
