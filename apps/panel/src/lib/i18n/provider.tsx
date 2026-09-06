'use client'

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type { Locale } from '@/lib/i18n/config'
import { createT, type Messages, type TranslateFn } from '@/lib/i18n'

type LocaleContextValue = {
  locale: Locale
  messages: Messages
  t: TranslateFn
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale
  messages: Messages
  children: ReactNode
}) {
  const value = useMemo(
    () => ({ locale, messages, t: createT(messages) }),
    [locale, messages],
  )
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale yalnızca LocaleProvider içinde kullanılabilir.')
  }
  return ctx
}

export function useT(): TranslateFn {
  return useLocale().t
}
