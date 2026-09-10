'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import type { Locale } from '@/lib/i18n/config'
import { createT, getMessages, type Messages, type TranslateFn } from '@/lib/i18n'
import { setLocale as persistLocale } from '@/lib/i18n/actions'

type LocaleContextValue = {
  locale: Locale
  messages: Messages
  t: TranslateFn
  pending: boolean
  setLocale: (next: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  locale: initialLocale,
  messages: initialMessages,
  children,
}: {
  locale: Locale
  messages: Messages
  children: ReactNode
}) {
  const [locale, setLocaleState] = useState(initialLocale)
  const [messages, setMessages] = useState(initialMessages)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setLocaleState(initialLocale)
    setMessages(initialMessages)
  }, [initialLocale, initialMessages])

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return
      setLocaleState(next)
      setMessages(getMessages(next))
      if (typeof document !== 'undefined') {
        document.documentElement.lang = next
      }
      startTransition(async () => {
        await persistLocale(next)
      })
    },
    [locale],
  )

  const value = useMemo(
    () => ({
      locale,
      messages,
      t: createT(messages),
      pending,
      setLocale,
    }),
    [locale, messages, pending, setLocale],
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
