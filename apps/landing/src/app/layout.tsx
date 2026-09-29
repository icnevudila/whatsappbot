import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://mesajify.com'),
  title: 'Mesajify — Yeni Nesil WhatsApp Kampanya & Medya Stüdyosu',
  description:
    'Yapay zeka destekli kreatif üretim, çoklu hat yönetimi ve akıllı gönderim motoru. Kampanyalarınızı riske atmadan, hattı koruyan hızla ölçekleyin.',
  icons: {
    icon: [
      { url: '/logos/mesajify_app_icon_corporate_squircle.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
  },
  openGraph: {
    title: 'Mesajify — Yeni Nesil WhatsApp Kampanya & Medya Stüdyosu',
    description:
      'Yapay zeka destekli kreatif üretim, çoklu hat yönetimi ve akıllı gönderim motoru. Kampanyalarınızı riske atmadan, hattı koruyan hızla ölçekleyin.',
    url: 'https://mesajify.com',
    siteName: 'Mesajify',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mesajify — Yeni Nesil WhatsApp Kampanya & Medya Stüdyosu',
    description:
      'Yapay zeka destekli kreatif üretim, çoklu hat yönetimi ve akıllı gönderim motoru.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0c0e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={`${outfit.variable} ${jetbrains.variable} font-sans antialiased min-h-screen bg-canvas text-ink`}>
        {children}
      </body>
    </html>
  )
}
