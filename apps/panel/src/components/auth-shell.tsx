import Link from 'next/link'
import type { ReactNode } from 'react'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { LogoMark, Wordmark } from './brand'

/**
 * Pilot auth split: graphite aside + paper form.
 * Filo domain copy; Shopify yok.
 */
export function AuthShell({
  children,
  asideTitle = (
    <>
      Hatlarını bağla,
      <br />
      <span className="text-[#9db8f5]">kampanyayı bırak.</span>
    </>
  ),
  asideLead = 'QR veya eşleştirme koduyla WhatsApp hatlarını bağlayın. Gönderim sunucuda sürer; panel kapalıyken de devam eder.',
  backHref = '/giris',
  backLabel = '← Giriş',
  footerLabel = 'Filo · WhatsApp toplu gönderim workbench',
  privacyLabel = 'Gizlilik',
  termsLabel = 'Kullanım koşulları',
}: {
  children: ReactNode
  asideTitle?: ReactNode
  asideLead?: string
  backHref?: string
  backLabel?: string
  footerLabel?: string
  privacyLabel?: string
  termsLabel?: string
}) {
  return (
    <div className="grid min-h-dvh bg-canvas md:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[var(--color-hero)] px-10 py-12 text-white md:flex lg:px-14 lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[rgba(47,91,255,0.08)]"
        />
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 text-white">
            <span className="grid size-9 place-items-center bg-accent text-[15px] font-black text-accent-ink">
              F
            </span>
            <span className="text-[18px] font-black tracking-[-0.03em]">Filo</span>
          </Link>
          <h2 className="mt-12 max-w-[14ch] text-[clamp(28px,3.5vw,40px)] font-black leading-[1.1] tracking-[-0.035em]">
            {asideTitle}
          </h2>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-white/80">{asideLead}</p>
        </div>
        <p className="relative z-10 text-[12px] font-semibold text-white/55">{footerLabel}</p>
      </aside>

      <main className="relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-5 md:px-8">
          <Link href="/" className="inline-flex md:hidden">
            <Wordmark />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <LocaleSwitcher compact />
            <Link
              href={backHref}
              className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
            >
              {backLabel}
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-8 md:px-8">
          <div className="filo-fade-up w-full max-w-[420px]">
            <div className="mb-6 inline-flex items-center gap-2 md:hidden">
              <LogoMark className="size-6" />
              <span className="text-[15px] font-semibold tracking-[-0.02em]">Filo</span>
            </div>
            <div className="rounded-[16px] border border-hairline bg-surface px-7 py-8 shadow-[var(--shadow-card)]">
              {children}
            </div>
            <div className="mt-5 flex justify-center gap-5 text-[11.5px] text-ink-faint">
              <Link href="/kvkk" className="hover:text-ink-muted">
                {privacyLabel}
              </Link>
              <Link href="/kosullar" className="hover:text-ink-muted">
                {termsLabel}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
