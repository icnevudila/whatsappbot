import type { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n/server'
import { StudioLanding } from './studio-landing'
import './landing/landing.css'

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getDictionary()
  const L = locale === 'en' ? {
    metaTitle: 'Mesajify — Create. Plan. Connect.',
    metaDescription: 'Bring AI creative images, short videos, WhatsApp campaigns and customer conversations into one workspace. Explore Mesajify.',
  } : {
    metaTitle: 'Mesajify — Fikrin dikkat çeksin. Markan konuşulsun.',
    metaDescription: 'Yapay zekâ görselleri, kısa videolar, WhatsApp kampanyaları ve müşteri görüşmeleri tek çalışma alanında. Mesajify’ı keşfet.',
  }
  return {
    title: { absolute: L.metaTitle },
    description: L.metaDescription,
    openGraph: {
      title: L.metaTitle,
      description: L.metaDescription,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Mesajify — Üret, planla, iletişim kur',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: L.metaTitle,
      description: L.metaDescription,
      images: ['/og-image.png'],
    },
  }
}

export default function Landing() {
  return <StudioLanding />
}
