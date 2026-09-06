import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Outfit } from 'next/font/google'
import { BRAND_NAME, BRAND_TAGLINE } from '@/components/brand'
import { NativeShell } from '@/components/native-shell'
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
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    'Kendi WhatsApp hatlarınızı bağlayın, kişi listenizi yükleyin, hattı yakmayan hızda toplu kampanya gönderin.',
  openGraph: {
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description:
      'Kendi WhatsApp hatlarınızı bağlayın, kişi listenizi yükleyin, hattı yakmayan hızda toplu kampanya gönderin.',
    locale: 'tr_TR',
    type: 'website',
    siteName: BRAND_NAME,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f3f5f9',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, messages } = await getDictionary()

  return (
    <html lang={locale}>
      <body className={`${outfit.variable} ${jetbrains.variable} font-sans antialiased`}>
        <LocaleProvider locale={locale} messages={messages}>
          <NativeShell />
          {children}
        </LocaleProvider>
      </body>
    </html>
  )
}
