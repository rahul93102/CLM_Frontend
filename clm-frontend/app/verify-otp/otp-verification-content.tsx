'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { verifyEmailOTP, requestLoginOTP, verifyPasswordResetOTP, resendPasswordResetOTP } from '@/app/lib/api'

type OTPType = 'email' | 'password-reset' | 'login'

export default function OTPVerificationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const otpType = (searchParams?.get('type') || 'email') as OTPType
  const [email, setEmail] = useState(searchParams?.get('email') || '')

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)
  const [verificationSuccess, setVerificationSuccess] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [tempEmail, setTempEmail] = useState(email)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Resend countdown
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCountdown])

  // Auto-focus first input
  useEffect(() => {
    if (email && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [email])

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const digits = pastedText.replace(/\D/g, '').split('')
    
    if (digits.length > 0) {
      const newOtp = [...otp]
      digits.forEach((digit, index) => {
        if (index < 6) {
          newOtp[index] = digit
        }
      })
      setOtp(newOtp)
      
      // Focus last filled input
      const lastIndex = Math.min(digits.length - 1, 5)
      inputRefs.current[lastIndex]?.focus()
    }
  }

  const otpCode = otp.join('')

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setIsLoading(true)

    try {
      if (otpType === 'email') {
        await verifyEmailOTP({ email, otp: otpCode })
      } else if (otpType === 'password-reset') {
        await verifyPasswordResetOTP({ email, otp: otpCode })
      } else if (otpType === 'login') {
        await verifyEmailOTP({ email, otp: otpCode })
      }

      setVerificationSuccess(true)
      setTimeout(() => {
        if (otpType === 'password-reset') {
          router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${otpCode}`)
        } else {
          router.push('/dashboard')
        }
      }, 1500)
    } catch (err: any) {
      setError(
        err?.message ||
          'Invalid OTP. Please try again. Remaining attempts will be shown.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeEmail = () => {
    setEmail(tempEmail)
    setOtp(['', '', '', '', '', ''])
    setError('')
    setShowChangeEmail(false)
    inputRefs.current[0]?.focus()
  }

  const handleResend = async () => {
    setError('')
    setIsLoading(true)

    try {
      if (otpType === 'email' || otpType === 'login') {
        await requestLoginOTP(email)
      } else if (otpType === 'password-reset') {
        await resendPasswordResetOTP(email)
      }

      setResendCountdown(30)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getTitle = () => {
    switch (otpType) {
      case 'password-reset':
        return 'Verify Identity'
      case 'login':
        return 'Verify Email'
      default:
        return 'Verify Email'
    }
  }

  const getSubtitle = () => {
    switch (otpType) {
      case 'password-reset':
        return `Enter the 6-digit code sent to ${email}`
      case 'login':
        return `Enter the 6-digit code sent to ${email}`
      default:
        return `Enter the 6-digit code sent to ${email}`
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
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              {getTitle()}
            </h2>
            <p className="text-gray-600">{getSubtitle()}</p>
          </div>

          {/* Success Message */}
          {verificationSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-600">✓ OTP verified successfully!</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-8">
            {/* Email Display with Change Option */}
            {showChangeEmail ? (
              <div className="space-y-3">
                <input
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter new email"
                />
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Update Email
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-2">OTP sent to:</p>
                <p className="text-lg font-semibold text-gray-900 mb-2">{email}</p>
                <button
                  type="button"
                  onClick={() => setShowChangeEmail(true)}
                  className="text-sm text-pink-600 hover:text-pink-700"
                >
                  Change Email
                </button>
              </div>
            )}

            {/* OTP Input Fields */}
            <div className="space-y-4">
              <label className="block text-sm text-gray-700 font-medium">
                Enter 6-digit code
              </label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                    disabled={isLoading || verificationSuccess}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || verificationSuccess || otpCode.length !== 6}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:shadow-lg hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verificationSuccess
                ? 'Verified ✓'
                : isLoading
                  ? 'Verifying...'
                  : 'Verify & Sign in'}
            </button>
          </form>

          {/* Resend OTP */}
          <div className="mt-8 text-center">
            {resendCountdown > 0 ? (
              <p className="text-gray-600 text-sm">
                Resend code in{' '}
                <span className="font-semibold text-gray-900">
                  {resendCountdown}s
                </span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isLoading || verificationSuccess}
                className="text-sm font-medium text-pink-600 hover:text-pink-700 transition disabled:text-gray-400"
              >
                Didn't receive the code? Resend OTP
              </button>
            )}
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition flex items-center justify-center gap-2"
            >
              ← Back to Password Login
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
