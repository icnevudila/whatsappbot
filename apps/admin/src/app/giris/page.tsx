import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthForm } from './auth-form'

export const metadata: Metadata = {
  title: 'Giriş',
  description: 'Filo platform yönetimi girişi.',
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
    <div className="grid min-h-dvh bg-canvas md:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[var(--color-hero)] px-10 py-12 text-white md:flex lg:px-14">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(47,91,255,0.08)]" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <span className="grid size-9 place-items-center bg-accent text-[15px] font-black text-accent-ink">
              F
            </span>
            <span className="text-[18px] font-black tracking-[-0.03em]">Filo Admin</span>
          </div>
          <h2 className="mt-12 max-w-[14ch] text-[clamp(28px,3.5vw,40px)] font-black leading-[1.1] tracking-[-0.035em]">
            Platform
            <br />
            <span className="text-[#9db8f5]">yönetimi.</span>
          </h2>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-white/80">
            Yalnızca platform yöneticisi hesapları. Müşteri paneli değildir.
          </p>
        </div>
        <p className="relative z-10 text-[12px] font-semibold text-white/55">Filo · admin</p>
      </aside>

      <main className="flex min-h-dvh items-center justify-center px-5 py-12">
        <div className="filo-fade-in w-full max-w-[420px]">
          <div className="mb-6 md:hidden">
            <div className="mb-3 inline-flex items-center gap-2">
              <LogoMark className="size-6" />
              <span className="text-[15px] font-semibold tracking-[-0.02em]">Filo Admin</span>
            </div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Platform girişi</h1>
          </div>
          <div className="rounded-[16px] border border-hairline bg-surface px-7 py-8 shadow-[var(--shadow-card)]">
            <h1 className="mb-1 hidden text-[22px] font-semibold tracking-[-0.02em] md:block">
              Platform girişi
            </h1>
            <p className="mb-5 hidden text-[12.5px] text-ink-muted md:block">
              Yalnızca platform yöneticisi hesapları girebilir.
            </p>
            <Suspense fallback={<div className="h-[180px]" aria-hidden />}>
              <AuthForm />
            </Suspense>
          </div>
          <p className="mt-5 text-[11.5px] leading-relaxed text-ink-faint">
            Bu ekran müşteri paneli değildir. Yetkisiz hesaplar reddedilir.
          </p>
        </div>
      </main>
    </div>
  )
}
