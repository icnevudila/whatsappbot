import type { Locale } from './config'
import { en } from './messages/en'
import { tr } from './messages/tr'

export type Messages = typeof tr

const catalogs: Record<Locale, Messages> = { tr, en }

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs.tr
}

export type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string

/** Dot-path çeviri: t('nav.ozet') · t('setup.stepOf', { current: 1, total: 4 }) */
export function createT(messages: Messages): TranslateFn {
  return (key, vars) => {
    const parts = key.split('.')
    let cursor: unknown = messages
    for (const part of parts) {
      if (cursor && typeof cursor === 'object' && part in cursor) {
        cursor = (cursor as Record<string, unknown>)[part]
      } else {
        return key
      }
    }
    if (typeof cursor !== 'string') return key
    if (!vars) return cursor
    return cursor.replace(/\{(\w+)\}/g, (_, name: string) =>
      vars[name] != null ? String(vars[name]) : `{${name}}`,
    )
  }
}
