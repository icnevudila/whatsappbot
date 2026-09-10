import { redirect } from 'next/navigation'

export default function BlacklistRedirectPage() {
  redirect('/ayarlar/engellenenler')
}
