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
  const bName = brandName.trim() || 'İşletmemiz'
  const rawProduct = productName.trim() || 'Ürünümüz'
  const pName = rawProduct.toLocaleLowerCase('tr').startsWith(`${bName.toLocaleLowerCase('tr')} `)
    ? rawProduct.slice(bName.length).trim() : rawProduct
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

  // Do not squeeze arbitrary catalog/offer text into the speech window.
  // The exact full product and offer remain in the campaign, not truncated claims.
  const shortSubject = pName.split(/\s+/).length <= 4 ? pName : 'ürününü'
  const line = `${bName} ${shortSubject} için bilgi ve sipariş almak üzere bize yazın.`
  const voiceover = line.split(/\s+/).length <= 14
    ? line : 'Ürünümüzü yakından incelemek, bilgi ve sipariş almak için bize yazın.'

  return {
    headline,
    supportingLine,
    cta,
    voiceover,
  }
}
