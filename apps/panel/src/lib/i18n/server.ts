import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './config'
import { getMessages, type Messages } from './index'

export async function getLocale(): Promise<Locale> {
  const jar = await cookies()
  const raw = jar.get(LOCALE_COOKIE)?.value
  return isLocale(raw) ? raw : DEFAULT_LOCALE
}

export async function getDictionary(): Promise<{ locale: Locale; messages: Messages }> {
  const locale = await getLocale()
  return { locale, messages: getMessages(locale) }
}
