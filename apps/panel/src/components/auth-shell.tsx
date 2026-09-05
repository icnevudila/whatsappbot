import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogoMark, Wordmark } from './brand'

/** Şifre yenile / unuttum ekranları — giriş polish’i ile aynı dil. */
export function AuthShell({ children }: { children: ReactNode }) {
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
          href="/giris"
          className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
        >
          ← Giriş
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-8">
        <div className="filo-fade-up w-full max-w-[380px]">
          <div className="mb-6 inline-flex items-center gap-2">
            <LogoMark className="size-6" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Filo</span>
          </div>
          <div className="border border-hairline bg-surface p-5 shadow-[var(--shadow-card)]">
            {children}
          </div>
          <div className="mt-5 flex justify-center gap-5 text-[11.5px] text-ink-faint">
            <Link href="/kvkk" className="hover:text-ink-muted">
              Gizlilik
            </Link>
            <Link href="/kosullar" className="hover:text-ink-muted">
              Kullanım koşulları
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
