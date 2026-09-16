import type { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n/server'
import { LandingHome } from './landing-home'
import './landing/landing.css'

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getDictionary()
  const L = messages.landing
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
          alt: 'Mesajify — Çoklu hattan toplu kampanya gönderimi',
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
  return <LandingHome />
}
