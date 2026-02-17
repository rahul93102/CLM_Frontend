'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    google?: any
  }
}

type Props = {
  clientId: string | undefined
  disabled?: boolean
  onCredential: (credential: string) => Promise<void> | void
  onError?: (message: string) => void
}

let googleScriptPromise: Promise<void> | null = null
let initializedClientId: string | null = null

function loadGoogleScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.accounts?.id) return Promise.resolve()

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Failed to load Google script')))
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google script'))
      document.head.appendChild(script)
    })
  }

  return googleScriptPromise
}

export default function GoogleSignInButton({ clientId, disabled, onCredential, onError }: Props) {
  const buttonDivRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!clientId) {
        setReady(false)
        return
      }

      try {
        await loadGoogleScript()
        if (cancelled) return

        if (!window.google?.accounts?.id) {
          throw new Error('Google Identity Services not available')
        }

        // In React StrictMode (dev), effects can run twice; avoid repeated init.
        if (initializedClientId !== clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (resp: any) => {
              try {
                const cred = resp?.credential
                if (!cred) throw new Error('Missing Google credential')
                await onCredential(cred)
              } catch (e: any) {
                onError?.(e?.message || 'Google sign-in failed')
              }
            },
          })
          initializedClientId = clientId
        }


        // Render the official button in our container.
        if (buttonDivRef.current) {
          // Ensure centering works even if the Google renderer injects inline styles.
          buttonDivRef.current.style.display = 'flex'
          buttonDivRef.current.style.justifyContent = 'center'
          buttonDivRef.current.style.width = '100%'

          const containerWidth = buttonDivRef.current.parentElement?.clientWidth || 360
          const width = Math.max(220, Math.min(360, containerWidth))

          buttonDivRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(buttonDivRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width,
          })
        }

        setReady(true)
      } catch (e: any) {
        setReady(false)
        onError?.(e?.message || 'Failed to initialize Google sign-in')
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [clientId, onCredential, onError])

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className="w-[360px] max-w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-500"
        title="Google sign-in is not configured on this environment"
        aria-disabled="true"
        onClick={() => {
          onError?.('Google sign-in is not configured')
        }}
      >
        Continue with Google
      </button>
    )
  }

  const isDisabled = disabled || !ready

  return (
    <div className={`w-full flex justify-center ${isDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="relative w-full" style={{ minHeight: 44 }}>
        <div ref={buttonDivRef} className="w-full" />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-600 shadow-sm">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
              Loading Google…
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
