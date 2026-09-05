import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { LogoMark, Wordmark } from '@/components/brand'
import { AuthForm } from './auth-form'
import { AuthModeCopy } from './auth-mode-copy'

export const metadata: Metadata = {
  title: 'Giriş',
  description: 'Filo paneline giriş yapın veya ücretsiz hesap oluşturun.',
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,var(--color-accent-soft),transparent_55%),linear-gradient(180deg,var(--color-canvas)_0%,var(--color-canvas-alt)_100%)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-5 py-5">
        <Link href="/" className="inline-flex">
          <Wordmark />
        </Link>
        <Link
          href="/"
          className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
        >
          ← Ana sayfa
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-8">
        <div className="filo-fade-up w-full max-w-[380px]">
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2">
              <LogoMark className="size-6" />
              <span className="text-[15px] font-semibold tracking-[-0.02em]">Filo</span>
            </div>
            <Suspense
              fallback={
                <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Giriş yap</h1>
              }
            >
              <AuthModeCopy />
            </Suspense>
          </div>

          <div className="border border-hairline bg-surface p-5 shadow-[var(--shadow-card)]">
            <Suspense fallback={<div className="h-[260px]" aria-hidden />}>
              <AuthForm />
            </Suspense>
          </div>

          <p className="mt-5 text-[11.5px] leading-relaxed text-ink-faint">
            Gönderim yalnızca WhatsApp’ta kayıtlı numaralara yapılır; hat başına günlük kota
            uygulanır. Bu sınırlar hattınızın kısıtlanmasını azaltmak içindir.
          </p>
        </div>
      </div>
    </main>
  )
}
