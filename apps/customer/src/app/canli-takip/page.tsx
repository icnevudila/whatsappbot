import type { Metadata } from 'next'
import { OperationsDashboard } from './operations-dashboard'

export const metadata: Metadata = {
  title: 'Canlı Takip & Bot Operasyon Merkezi',
  description: 'WhatsApp hatları, gelen/giden mesajlar, ChatGPT yanıtları ve sunucu sağlığı canlı izleme ekranı.',
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = 'force-dynamic'

export default function CanliTakipPage() {
  return <OperationsDashboard section="overview" />
}
