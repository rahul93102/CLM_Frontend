import Link from 'next/link'
import { Shield } from 'lucide-react'

type AuthTab = 'login' | 'register'

export default function AuthCardShell({
  title,
  subtitle,
  activeTab,
  children,
}: {
  title: string
  subtitle?: string
  activeTab?: AuthTab
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(29,78,216,0.10),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(29,78,216,0.08),transparent_45%),radial-gradient(circle_at_40%_90%,rgba(0,0,0,0.06),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.88),rgba(255,255,255,1))]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          <div className="rounded-3xl bg-white border border-black/10 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="h-px w-full bg-black/10" />
            <div className="px-8 pt-8 pb-7">
              {/* Brand */}
              <div className="mx-auto flex items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-sm">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black tracking-[0.24em] uppercase text-black/45">LawFlow</div>
                </div>
              </div>

              <h1 className="mt-6 text-center text-2xl font-black tracking-tight text-black">{title}</h1>
              {subtitle ? <p className="mt-1 text-center text-sm font-medium text-black/55">{subtitle}</p> : null}

              {/* Tabs */}
              {activeTab ? (
                <div className="mt-6 rounded-2xl border border-black/10 bg-white p-1">
                  <div className="grid grid-cols-2 gap-1">
                    <Link
                      href="/login"
                      className={
                        activeTab === 'login'
                          ? 'rounded-xl bg-black text-white py-2.5 text-center text-sm font-bold'
                          : 'rounded-xl py-2.5 text-center text-sm font-bold text-black/60 hover:text-black'
                      }
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className={
                        activeTab === 'register'
                          ? 'rounded-xl bg-black text-white py-2.5 text-center text-sm font-bold'
                          : 'rounded-xl py-2.5 text-center text-sm font-bold text-black/60 hover:text-black'
                      }
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="mt-7">{children}</div>

              <div className="mt-7 text-center text-[11px] font-medium text-black/45">
                By continuing, you agree to your organization’s security policies.
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-[11px] font-medium text-black/40">
            © {new Date().getFullYear()} LawFlow. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}
