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
    },
  }
}

export default function Landing() {
  return <LandingHome />
}
