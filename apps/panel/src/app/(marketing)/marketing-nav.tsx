'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Wordmark } from '@/components/brand'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { useT } from '@/lib/i18n/provider'

export function MarketingNav() {
  const [open, setOpen] = useState(false)
  const t = useT()

  const sections = [
    { href: '#kapasite', label: t('marketing.capacity') },
    { href: '#sorun', label: t('marketing.problem') },
    { href: '#nasil', label: t('marketing.how') },
    { href: '#urun', label: t('marketing.productNav') },
    { href: '#gun', label: t('marketing.day') },
    { href: '#guvenlik', label: t('marketing.security') },
    { href: '#fiyatlar', label: t('marketing.pricing') },
    { href: '#sss', label: t('marketing.faq') },
  ] as const

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>

        <nav className="hidden flex-1 items-center gap-3 lg:flex lg:gap-4 xl:gap-5" aria-label={t('marketing.sections')}>
          {sections.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="whitespace-nowrap text-[12px] text-ink-muted transition-colors hover:text-ink xl:text-[12.5px]"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LocaleSwitcher compact />
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-hairline-strong px-2.5 text-[12px] text-ink-muted lg:hidden"
            aria-expanded={open}
            aria-controls="marketing-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t('marketing.close') : t('marketing.menu')}
          </button>
          <Link
            href="/giris"
            className="rounded-md px-2.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
          >
            {t('auth.signIn')}
          </Link>
          <Link
            href="/giris?mod=kayit"
            className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[12.5px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
          >
            {t('auth.signUp')}
          </Link>
        </div>
      </div>

      {open ? (
        <nav
          id="marketing-mobile-nav"
          className="border-t border-hairline bg-surface px-5 py-3 lg:hidden"
          aria-label={t('marketing.mobileSections')}
        >
          <ul className="flex flex-col gap-1">
            {sections.map((section) => (
              <li key={section.href}>
                <a
                  href={section.href}
                  className="block rounded-md px-2 py-2 text-[13px] text-ink-muted hover:bg-surface-raised hover:text-ink"
                  onClick={() => setOpen(false)}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
