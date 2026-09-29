'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Wordmark } from '@/components/brand'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { useT } from '@/lib/i18n/provider'

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  )
}

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

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-hairline bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5">
          <Link href="/" className="shrink-0" onClick={close}>
            <Wordmark />
          </Link>

          <nav
            className="hidden flex-1 items-center gap-3 lg:flex lg:gap-4 xl:gap-5"
            aria-label={t('marketing.sections')}
          >
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

          <div className="ml-auto flex items-center gap-2">
            <LocaleSwitcher compact />
            <Link
              href="/giris"
              className="hidden rounded-md px-2.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-ink sm:inline"
            >
              {t('auth.signIn')}
            </Link>
            <a
              href="mailto:destek@filo.app?subject=Filo%20eri%C5%9Fim%20talebi"
              className="hidden h-8 items-center rounded-md bg-accent px-3 text-[12.5px] font-medium text-accent-ink transition-colors hover:bg-accent-dim sm:inline-flex"
            >
              {t('auth.contact')}
            </a>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink lg:hidden"
              aria-expanded={open}
              aria-controls="marketing-mobile-nav"
              aria-label={open ? t('marketing.close') : t('marketing.menu')}
              onClick={() => setOpen((v) => !v)}
            >
              <MenuIcon open={open} />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 lg:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-[var(--color-hero)]/40 backdrop-blur-[2px]"
          aria-label={t('marketing.close')}
          onClick={close}
        />
        <aside
          id="marketing-mobile-nav"
          className={`absolute inset-y-0 right-0 flex w-[min(100vw-3rem,20rem)] flex-col border-l border-hairline bg-surface shadow-[var(--shadow-md)] transition-transform duration-300 ease-[var(--ease-out)] ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-14 items-center justify-between border-b border-hairline px-4">
            <span className="text-[13px] font-semibold text-ink">{t('marketing.menu')}</span>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-surface-raised hover:text-ink"
              onClick={close}
              aria-label={t('marketing.close')}
            >
              <MenuIcon open />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t('marketing.mobileSections')}>
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
              {t('marketing.sections')}
            </p>
            <ul className="flex flex-col gap-0.5">
              {sections.map((section) => (
                <li key={section.href}>
                  <a
                    href={section.href}
                    className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-[14px] font-medium text-ink-muted hover:bg-surface-raised hover:text-ink"
                    onClick={close}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="my-4 border-t border-hairline" />

            <div className="flex flex-col gap-2 px-1">
              <Link
                href="/giris"
                onClick={close}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-hairline-strong text-[13px] font-medium text-ink-muted hover:bg-surface-raised hover:text-ink"
              >
                {t('auth.signIn')}
              </Link>
              <a
                href="mailto:destek@filo.app?subject=Filo%20eri%C5%9Fim%20talebi"
                onClick={close}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-[13px] font-medium text-accent-ink hover:bg-accent-dim"
              >
                {t('auth.contact')}
              </a>
            </div>
          </nav>
        </aside>
      </div>
    </>
  )
}
