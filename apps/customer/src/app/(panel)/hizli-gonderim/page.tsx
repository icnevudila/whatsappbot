import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Hızlı gönderim' }

/** Eski bookmark’lar → hatlar sayfasındaki test gönderimi. */
export default function QuickSendRedirectPage() {
  redirect('/ayarlar/hatlar')
}
