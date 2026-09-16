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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://mesajify.com'),
  title: {
    default: `${BRAND_NAME} — Çoklu hattan toplu kampanya gönderimi`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: 'Kendi hatlarınızı bağlayın, kişi listenizi yükleyin, hattı koruyan hızda toplu kampanya gönderin. Numara doğrulama, ısındırma ve otomatik durdurma dahil.',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: `${BRAND_NAME} — Çoklu hattan toplu kampanya gönderimi`,
    description: 'Kendi hatlarınızı bağlayın, kişi listenizi yükleyin, hattı koruyan hızda toplu kampanya gönderin. Numara doğrulama, ısındırma ve otomatik durdurma dahil.',
    url: 'https://mesajify.com',
    siteName: BRAND_NAME,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} — WhatsApp Otomasyonu & Kampanya Platformu`,
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — Çoklu hattan toplu kampanya gönderimi`,
    description: 'Kendi hatlarınızı bağlayın, kişi listenizi yükleyin, hattı koruyan hızda toplu kampanya gönderin.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f3f5f9',
  interactiveWidget: 'resizes-content',
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
