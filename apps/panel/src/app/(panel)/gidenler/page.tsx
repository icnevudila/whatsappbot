import { redirect } from 'next/navigation'

/** Eski Gidenler URL’si → birleşik Mesajlar (giden sekmesi). */
export default function GidenlerRedirect() {
  redirect('/mesajlar?sekme=giden')
}
