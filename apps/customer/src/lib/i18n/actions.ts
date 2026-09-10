'use server'

import { cookies } from 'next/headers'
import { isLocale, LOCALE_COOKIE, type Locale } from './config'

/** Cookie yazar; layout revalidate / full refresh yok — istemci katalogu anında değişir. */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return
  const jar = await cookies()
  jar.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}
