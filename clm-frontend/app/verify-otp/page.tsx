'use client'

import { Suspense } from 'react'
import OTPVerificationContent from './otp-verification-content'

export default function OTPVerificationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OTPVerificationContent />
    </Suspense>
  )
}
