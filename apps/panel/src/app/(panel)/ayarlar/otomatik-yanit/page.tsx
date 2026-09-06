import { redirect } from 'next/navigation'

/** MVP dışı — eski otomatik yanıt URL’si. */
export default function AutoReplyRemovedRedirect() {
  redirect('/ayarlar')
}
