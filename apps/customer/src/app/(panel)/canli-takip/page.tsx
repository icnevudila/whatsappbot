import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/org'
import { LiveDashboard } from './live-dashboard'

export const metadata: Metadata = {
  title: 'Canlı Takip & Bot Operasyon Merkezi',
  description: 'WhatsApp hatları, gelen/giden mesajlar, ChatGPT yanıtları ve sunucu sağlığı canlı izleme ekranı.',
}

export const dynamic = 'force-dynamic'

export default async function CanliTakipPage() {
  try {
    await requireActiveOrg()
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  return <LiveDashboard />
}
