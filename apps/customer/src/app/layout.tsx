import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Outfit } from 'next/font/google'
import { BRAND_NAME } from '@/components/brand'
import { LocaleProvider } from '@/lib/i18n/provider'
import { getDictionary } from '@/lib/i18n/server'
import './globals.css'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} — Müşteri paneli`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: 'WhatsApp hattınızı bağlayın, kişilerinizi yükleyin, kampanyanızı gönderin.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f3f5f9',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, messages } = await getDictionary()

  return (
    <html lang={locale}>
      <body className={`${outfit.variable} ${jetbrains.variable} font-sans antialiased`}>
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  )
}
