import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Hızlı gönderim' }

/** Eski bookmark’lar → Kampanyalar içindeki tek numara / test bölümü. */
export default async function QuickSendRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ media?: string | string[]; tel?: string | string[] }>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  const media = Array.isArray(params.media) ? params.media[0] : params.media
  const tel = Array.isArray(params.tel) ? params.tel[0] : params.tel
  if (media) qs.set('media', media)
  if (tel) qs.set('tel', tel)
  const q = qs.toString()
  redirect(q ? `/kampanyalar?${q}#hizli` : '/kampanyalar#hizli')
}
