'use client'

import Link from 'next/link'
import { BRAND_NAME, LogoMark, Wordmark } from '@/components/brand'
import { useT } from '@/lib/i18n/provider'

export function MarketingFooter() {
  const t = useT()
  const year = new Date().getFullYear()

  const sections = [
    { href: '/#kapasite', label: t('marketing.capacity') },
    { href: '/#sorun', label: t('marketing.problem') },
    { href: '/#nasil', label: t('marketing.how') },
    { href: '/#urun', label: t('marketing.productNav') },
    { href: '/#gun', label: t('marketing.day') },
    { href: '/#guvenlik', label: t('marketing.security') },
    { href: '/#fiyatlar', label: t('marketing.pricing') },
    { href: '/#sss', label: t('marketing.faq') },
  ]

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-2 text-[12.5px] text-ink-muted">{t('marketing.blurb')}</p>
        </div>

        <div className="flex gap-12">
          <div className="flex flex-col gap-1.5">
            <p className="mb-1 text-[11.5px] font-medium text-ink-faint">{t('marketing.product')}</p>
            {sections.map((section) => (
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
            <p className="mb-1 text-[11.5px] font-medium text-ink-faint">{t('marketing.legal')}</p>
            <Link href="/kvkk" className="text-[12.5px] text-ink-muted hover:text-ink">
              {t('marketing.kvkk')}
            </Link>
            <Link href="/kosullar" className="text-[12.5px] text-ink-muted hover:text-ink">
              {t('marketing.terms')}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-4">
          <LogoMark className="size-3 text-ink-faint" />
          <p className="text-[11.5px] text-ink-faint">
            {BRAND_NAME} &middot; {year} &middot; {t('marketing.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  )
}
