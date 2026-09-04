import Link from 'next/link'
import { BRAND_NAME, LogoMark, Wordmark } from '@/components/brand'

const SECTIONS = [
  { href: '#kapasite', label: 'Kapasite' },
  { href: '#nasil', label: 'Nasıl çalışır' },
  { href: '#guvenlik', label: 'Ban önleme' },
  { href: '#fiyatlar', label: 'Fiyatlar' },
  { href: '#sss', label: 'SSS' },
]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
          <Link href="/" className="shrink-0">
            <Wordmark />
          </Link>

          <nav className="hidden flex-1 items-center gap-5 md:flex">
            {SECTIONS.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
              >
                {section.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link
              href="/giris"
              className="rounded-md px-2.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
            >
              Giriş yap
            </Link>
            <Link
              href="/giris?mod=kayit"
              className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[12.5px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
            >
              Ücretsiz dene
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Wordmark />
            <p className="mt-2 text-[12.5px] text-ink-muted">
              Kendi WhatsApp hatlarınızdan, hattı yakmayan hızda toplu kampanya
              gönderimi.
            </p>
          </div>

          <div className="flex gap-12">
            <div className="flex flex-col gap-1.5">
              <p className="mb-1 text-[11.5px] font-medium text-ink-faint">Ürün</p>
              {SECTIONS.map((section) => (
                <a
                  key={section.href}
                  href={section.href}
                  className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
                >
                  {section.label}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="mb-1 text-[11.5px] font-medium text-ink-faint">Yasal</p>
              <Link href="/kvkk" className="text-[12.5px] text-ink-muted hover:text-ink">
                KVKK aydınlatma metni
              </Link>
              <Link href="/kosullar" className="text-[12.5px] text-ink-muted hover:text-ink">
                Kullanım koşulları
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-hairline">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-4">
            <LogoMark className="size-3 text-ink-faint" />
            <p className="text-[11.5px] text-ink-faint">
              {BRAND_NAME} &middot; {new Date().getFullYear()} &middot; WhatsApp, Meta
              Platforms Inc. markasıdır; bu ürün Meta ile bağlantılı değildir.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
