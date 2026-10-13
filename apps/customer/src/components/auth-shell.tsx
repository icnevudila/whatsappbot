import Link from 'next/link'
import type { ReactNode } from 'react'
import { BRAND_NAME, LogoMark, Wordmark } from './brand'

export function AuthShell({
  children,
  asideTitle = (
    <>
      WhatsApp ile
      <br />
      <span className="text-[#25D366]">satışlarınızı büyütün.</span>
    </>
  ),
  asideLead = 'WhatsApp hatlarınızı bağlayın, hedef kitlenizi hazırlayın, kişiselleştirilmiş kampanyalarınızı güvenle gönderin.',
  footerLabel = `${BRAND_NAME} · WhatsApp Kampanya Platformu`,
  privacyLabel = 'Gizlilik Politikası',
  termsLabel = 'Kullanım Koşulları',
}: {
  children: ReactNode
  asideTitle?: ReactNode
  asideLead?: string
  footerLabel?: string
  privacyLabel?: string
  termsLabel?: string
}) {
  return (
    <div className="grid min-h-dvh bg-canvas md:grid-cols-2">
      {/* Sol Hero / Marka Alanı */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#07100C] px-10 py-12 text-white md:flex lg:px-14 lg:py-14">
        {/* Zarif arka plan radial ışığı */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-20 size-[420px] rounded-full bg-[rgba(34,197,94,0.09)] blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 size-[360px] rounded-full bg-[rgba(47,91,255,0.06)] blur-[90px]"
        />

        {/* Üst Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-90">
            <img
              src="/brand/mesajify-logo-full.png"
              alt={BRAND_NAME}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </Link>

          <h2 className="mt-14 max-w-[14ch] text-[clamp(28px,3.5vw,42px)] font-black leading-[1.15] tracking-[-0.035em]">
            {asideTitle}
          </h2>
          <p className="mt-5 max-w-[38ch] text-[15px] leading-relaxed text-white/75">{asideLead}</p>

          {/* Güven ve Özellik İpuçları */}
          <div className="mt-10 space-y-3.5 border-t border-white/10 pt-8 text-[13px] text-white/80">
            <div className="flex items-center gap-2.5">
              <span className="flex size-5 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366]">✓</span>
              <span>Akıllı Hat Yönetimi & Isındırma</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-5 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366]">✓</span>
              <span>Yapay Zeka Destekli Kreatif Stüdyo</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-5 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366]">✓</span>
              <span>Ortak Gelen Kutusu & Canlı İletim</span>
            </div>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[12px] font-medium text-white/50">
          <span>{footerLabel}</span>
          <span className="font-mono text-[11px] text-white/40">app.mesajify.com</span>
        </div>
      </aside>

      {/* Sağ Form Alanı */}
      <main className="relative flex min-h-dvh flex-col justify-between bg-canvas px-5 py-8 md:px-10 lg:px-14">
        {/* Mobil Header Logo */}
        <header className="flex items-center justify-between md:hidden">
          <Link href="/" className="inline-flex items-center">
            <Wordmark className="h-7 w-auto" />
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Panel Girişi
          </span>
        </header>

        {/* Form Kartı */}
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[400px]">
            {/* Desktop Üst Logo Vurgusu */}
            <div className="mb-6 hidden md:block">
              <Link href="/" className="inline-flex items-center">
                <Wordmark className="h-8 w-auto" />
              </Link>
            </div>

            <div className="rounded-[20px] border border-hairline bg-surface p-7 shadow-[var(--shadow-card)] sm:p-8">
              {children}
            </div>

            {/* Alt Menü Linkleri */}
            <div className="mt-6 flex justify-center gap-6 text-[12px] text-ink-muted">
              <Link href="/kvkk" className="transition-colors hover:text-ink">
                {privacyLabel}
              </Link>
              <span>·</span>
              <Link href="/kosullar" className="transition-colors hover:text-ink">
                {termsLabel}
              </Link>
            </div>
          </div>
        </div>

        {/* Telif & Güvenlik Alt Notu */}
        <footer className="text-center text-[11.5px] text-ink-faint">
          © {new Date().getFullYear()} {BRAND_NAME}. Tüm hakları saklıdır.
        </footer>
      </main>
    </div>
  )
}
