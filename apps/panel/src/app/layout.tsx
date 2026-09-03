import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { BRAND_NAME, BRAND_TAGLINE } from '@/components/brand'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    'Kendi WhatsApp hatlarinizi baglayin, kisi listenizi yukleyin, hatti yakmayan hizda toplu kampanya gonderin.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
