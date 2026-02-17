/**
 * Centralized environment-derived configuration.
 *
 * Cloudflare Pages / Next.js will inline NEXT_PUBLIC_* variables at build time.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:8000'

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

/**
 * Canonical backend base URL.
 *
 * Supported env vars (in priority order):
 * - NEXT_PUBLIC_API_BASE_URL (preferred)
 * - NEXT_PUBLIC_API_URL (legacy)
 */
export const API_BASE_URL: string = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API_BASE_URL
)
