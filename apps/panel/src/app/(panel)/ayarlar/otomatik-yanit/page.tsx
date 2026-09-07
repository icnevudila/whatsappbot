import { redirect } from 'next/navigation'

export const metadata = { title: 'Otomatik yanıt' }

/** Eski URL — otomatik yanıt henüz üye paneline açılmadı. */
export default function AutoReplyRedirectPage() {
  redirect('/ayarlar')
}
