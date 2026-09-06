'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useLocale } from '@/lib/i18n/provider'
import { setLocale } from '@/lib/i18n/actions'
import type { Locale } from '@/lib/i18n/config'

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const pick = (next: Locale) => {
    if (next === locale) return
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-hairline bg-surface p-0.5"
      role="group"
      aria-label={t('common.language')}
    >
      {(['tr', 'en'] as const).map((code) => {
        const active = locale === code
        const label = compact ? code.toUpperCase() : code === 'tr' ? t('common.turkish') : t('common.english')
        return (
          <button
            key={code}
            type="button"
            disabled={pending}
            onClick={() => pick(code)}
            className={`h-7 rounded-[5px] px-2 text-[11.5px] font-medium transition-colors ${
              active
                ? 'bg-accent text-accent-ink'
                : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
            }`}
            aria-pressed={active}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
