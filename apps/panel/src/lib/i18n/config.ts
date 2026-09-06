export type Locale = 'tr' | 'en'

export const LOCALES: Locale[] = ['tr', 'en']
export const DEFAULT_LOCALE: Locale = 'tr'
export const LOCALE_COOKIE = 'filo_locale'

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'tr' || value === 'en'
}

export function localeTag(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'tr-TR'
}
