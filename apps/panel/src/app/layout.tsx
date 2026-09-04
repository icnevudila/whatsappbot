import type { Metadata } from 'next'
import { JetBrains_Mono, Outfit } from 'next/font/google'
import { BRAND_NAME, BRAND_TAGLINE } from '@/components/brand'
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
    'Kendi WhatsApp hatlarinizi baglayin, kisi listenizi yukleyin, hatti yakmayan hizda toplu kampanya gonderin.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${outfit.variable} ${jetbrains.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
