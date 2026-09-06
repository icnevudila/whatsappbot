import type { Metadata } from 'next'
import { BRAND_NAME, BRAND_TAGLINE } from '@/components/brand'
import { MarketingFooter } from './marketing-footer'
import { MarketingNav } from './marketing-nav'

export const metadata: Metadata = {
  openGraph: {
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description:
      'Kendi hatlarınızı bağlayın, kişi listenizi yükleyin, hattı koruyan hızda toplu kampanya gönderin.',
    locale: 'tr_TR',
    type: 'website',
    siteName: BRAND_NAME,
  },
  twitter: {
    card: 'summary',
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description:
      'Kendi hatlarınızı bağlayın, kişi listenizi yükleyin, hattı koruyan hızda toplu kampanya gönderin.',
  },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
