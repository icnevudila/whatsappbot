import { redirect } from 'next/navigation'

/** Eski Gelenler URL’si → birleşik Mesajlar. */
export default async function GelenlerRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = new URLSearchParams()
  const tel = Array.isArray(params.tel) ? params.tel[0] : params.tel
  const sekme = Array.isArray(params.sekme) ? params.sekme[0] : params.sekme
  if (tel) next.set('tel', tel)
  if (sekme === 'yanitlar' || sekme === 'ilgili') next.set('sekme', 'yanitlar')
  else if (sekme === 'yeni' || sekme === 'diger') next.set('sekme', 'gelen')
  else if (sekme) next.set('sekme', sekme)
  const qs = next.toString()
  redirect(qs ? `/mesajlar?${qs}` : '/mesajlar')
}
