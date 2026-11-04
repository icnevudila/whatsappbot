import Link from 'next/link'
import type { ReactNode } from 'react'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { Wordmark, BRAND_NAME } from './brand'

/**
 * Mesajify Kurumsal Auth Shell:
 * Sol: Sitenin kurumsal WhatsApp yeşili (#008069)
 * Sağ: Yüksek kontrastlı, sade ve lüks giriş alanı
 */
export function AuthShell({
  children,
  asideTitle = (
    <>
      WhatsApp ile
      <br />
      <span className="text-white">satışlarınızı büyütün.</span>
    </>
  ),
  asideLead = 'WhatsApp hatlarınızı bağlayın, hedef kitlenizi hazırlayın, kişiselleştirilmiş kampanyalarınızı güvenle gönderin.',
  backHref = '/giris',
  backLabel = '← Giriş',
  footerLabel = 'Mesajify · WhatsApp Kampanya Platformu',
  privacyLabel = 'Gizlilik Politikası',
  termsLabel = 'Kullanım Koşulları',
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
    <div className="grid min-h-dvh bg-[#F8FAFC] md:grid-cols-2">
      {/* Sol Hero / Marka Alanı — Sitenin kurumsal WhatsApp yeşili (#008069) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-b from-[#008069] to-[#005c4b] px-10 py-12 text-white md:flex lg:px-14 lg:py-14">
        {/* Zarif arka plan ışığı */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_70%)]"
        />

        {/* Tek Yetkili Logo (Masaüstü Sol) ve Başlık */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-90">
            <img
              src="/brand/mesajify-logo-full.png"
              alt={BRAND_NAME}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </Link>

          <h2 className="mt-12 max-w-[15ch] text-[clamp(28px,3.5vw,42px)] font-bold leading-[1.15] tracking-[-0.035em] text-white">
            {asideTitle}
          </h2>
          <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-white/80">{asideLead}</p>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-[12px] font-medium text-white/70">
          <span>{footerLabel}</span>
          <span className="font-mono text-[11px] text-white/60">app.mesajify.com</span>
        </div>
      </aside>

      {/* Sağ Form Alanı */}
      <main className="relative flex min-h-dvh flex-col justify-between px-5 py-6 sm:px-8 md:px-10 lg:px-14">
        {/* Mobil Header */}
        <header className="flex items-center justify-between gap-3 md:hidden">
          <Link href="/" className="inline-flex items-center">
            <Wordmark className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher compact />
          </div>
        </header>

        {/* Form Alanı */}
        <div className="flex flex-1 items-center justify-center py-6 sm:py-10">
          <div className="w-full max-w-[420px]">
            <div className="rounded-[24px] border border-black/[0.08] bg-white p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] sm:p-9">
              {children}
            </div>
            <div className="mt-6 flex justify-center items-center gap-5 text-[12px] text-[#6B7280]">
              <Link href="/kvkk" className="hover:text-[#008069] transition-colors">
                {privacyLabel}
              </Link>
              <span className="text-black/20">·</span>
              <Link href="/kosullar" className="hover:text-[#008069] transition-colors">
                {termsLabel}
              </Link>
            </div>
          </div>
        </div>

        <footer className="text-center text-[12px] text-[#9CA3AF]">
          © {new Date().getFullYear()} {BRAND_NAME}. Tüm hakları saklıdır.
        </footer>
      </main>
    </div>
  )
}
