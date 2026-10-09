export function generateDeterministicLocalCopy({
  productName,
  brandName,
  objective,
  campaignDetail,
  offer,
  mediaType,
}: {
  productName: string
  brandName: string
  objective?: string
  campaignDetail?: string
  offer?: string
  mediaType: 'IMAGE' | 'VIDEO'
}): {
  headline: string
  supportingLine: string
  cta: string
  voiceover: string
} {
  const pName = productName.trim() || 'Ürünümüz'
  const bName = brandName.trim() || 'İşletmemiz'
  const detail = campaignDetail?.trim() || ''
  const off = offer?.trim() || ''

  const headline = off
    ? `${bName} ${pName} — ${off}`
    : detail
      ? `${bName} ${pName} — ${detail.slice(0, 45)}`
      : `${bName} ${pName}`

  const supportingLine = detail
    ? `${detail}. Detaylar ve sipariş için iletişime geçin.`
    : off
      ? `${off} fırsatıyla. Detaylı bilgi için bizimle iletişime geçin.`
      : `Ürünü incelemek ve ayrıntılı bilgi almak için bizimle iletişime geçin.`

  const cta = 'Hemen İnceleyin'

  // Voiceover strictly factual: 8 to 14 words, finishes well before 5.5s
  const voiceover = off
    ? `${bName} ${pName} ürününü ${off} fırsatıyla keşfedin. Detaylı bilgi için iletişime geçin.`
    : detail
      ? `${bName} ${pName} ürününü keşfedin. ${detail}. İncelemek için hemen iletişime geçin.`
      : `${bName} ${pName} ürününü keşfedin. Ayrıntılı bilgi ve sipariş için bizimle iletişime geçin.`

  return {
    headline,
    supportingLine,
    cta,
    voiceover,
  }
}
