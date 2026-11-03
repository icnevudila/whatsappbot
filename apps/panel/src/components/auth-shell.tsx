import Link from 'next/link'
import type { ReactNode } from 'react'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { Wordmark, BRAND_NAME } from './brand'

/**
 * Mesajify Kurumsal Auth Shell:
 * Sol: Koyu obsidyen marka alanı (Desktop)
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
      {/* Sol Hero / Marka Alanı */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0A0A0A] border-r border-black/[0.08] px-10 py-12 text-white md:flex lg:px-14 lg:py-14">
        {/* Zarif radyal arka plan ışığı (Monochrome & Premium) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.035),transparent_70%)]"
        />

        {/* Tek Yetkili Logo (Masaüstü Sol) */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-90">
            <img
              src="/brand/mesajify-logo-full.png"
              alt={BRAND_NAME}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </Link>

          <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[12px] font-medium text-zinc-300">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>Kurumsal WhatsApp Kampanya Altyapısı</span>
          </div>

          <h2 className="mt-5 max-w-[15ch] text-[clamp(28px,3.5vw,42px)] font-bold leading-[1.15] tracking-[-0.035em] text-white">
            {asideTitle}
          </h2>
          <p className="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-zinc-400">{asideLead}</p>

          {/* Güven ve Özellik Maddeleri */}
          <div className="mt-10 space-y-3 border-t border-white/[0.08] pt-8 text-[13px]">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300">
                <svg viewBox="0 0 16 16" fill="none" className="size-3 stroke-current stroke-2" aria-hidden>
                  <path d="M3.5 8.5L6.5 11.5L12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span><strong className="font-semibold text-white">Akıllı Hat Yönetimi & Isındırma</strong><span className="text-zinc-400"> — Hat sağlığını koruyan akıllı dağıtım</span></span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300">
                <svg viewBox="0 0 16 16" fill="none" className="size-3 stroke-current stroke-2" aria-hidden>
                  <path d="M3.5 8.5L6.5 11.5L12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span><strong className="font-semibold text-white">Yapay Zeka Destekli Kreatif Stüdyo</strong><span className="text-zinc-400"> — Marka kitine özel görsel ve video</span></span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300">
                <svg viewBox="0 0 16 16" fill="none" className="size-3 stroke-current stroke-2" aria-hidden>
                  <path d="M3.5 8.5L6.5 11.5L12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span><strong className="font-semibold text-white">Ortak Gelen Kutusu & Canlı İletim</strong><span className="text-zinc-400"> — Anlık yanıt ve müşteri etkileşimi</span></span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/[0.08] pt-5 text-[12px] font-medium text-zinc-500">
          <span>{footerLabel}</span>
          <span className="font-mono text-[11px] text-zinc-600">app.mesajify.com</span>
        </div>
      </aside>

      {/* Sağ Form Alanı */}
      <main className="relative flex min-h-dvh flex-col justify-between px-5 py-6 sm:px-8 md:px-10 lg:px-14">
        {/* Mobil Header: Tek yetkili logo (Masaüstünde sol aside'da olduğu için burada gizlenir) */}
        <header className="flex items-center justify-between gap-3 md:hidden">
          <Link href="/" className="inline-flex items-center">
            <Wordmark className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher compact />
          </div>
        </header>

        {/* Form Alanı (İkinci logo kaldırıldı, doğrudan form kartı) */}
        <div className="flex flex-1 items-center justify-center py-6 sm:py-10">
          <div className="w-full max-w-[420px]">
            <div className="rounded-[24px] border border-black/[0.08] bg-white p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] sm:p-9">
              {children}
            </div>
            <div className="mt-6 flex justify-center items-center gap-5 text-[12px] text-[#6B7280]">
              <Link href="/kvkk" className="hover:text-[#0A0A0A] transition-colors">
                {privacyLabel}
              </Link>
              <span className="text-black/20">·</span>
              <Link href="/kosullar" className="hover:text-[#0A0A0A] transition-colors">
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
