import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthForm } from './auth-form'
import { AuthModeCopy } from './auth-mode-copy'

export const metadata: Metadata = {
  title: 'Giriş',
  description: 'Filo kurulumuna giriş yapın veya hesap oluşturun.',
}

function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <circle cx="2.6" cy="2.6" r="2.2" className="fill-accent" />
      <rect x="0" y="6.6" width="16" height="1.7" rx="0.85" fill="currentColor" />
      <rect x="0" y="10" width="11" height="1.7" rx="0.85" fill="currentColor" opacity="0.72" />
      <rect x="0" y="13.4" width="6" height="1.7" rx="0.85" fill="currentColor" opacity="0.44" />
    </svg>
  )
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--color-canvas)_0%,var(--color-canvas-alt)_100%)]"
      />

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-12">
        <div className="filo-fade-in w-full max-w-[380px]">
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2">
              <LogoMark className="size-6" />
              <span className="text-[15px] font-semibold tracking-[-0.02em]">Filo</span>
            </div>
            <Suspense
              fallback={
                <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Kuruluma başla</h1>
              }
            >
              <AuthModeCopy />
            </Suspense>
          </div>

          <div className="border border-hairline bg-surface p-5 shadow-[var(--shadow-card)]">
            <Suspense fallback={<div className="h-[240px]" aria-hidden />}>
              <AuthForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
