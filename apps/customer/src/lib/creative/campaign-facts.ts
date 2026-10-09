export type CampaignFacts = {
  objective?: unknown; headline?: unknown; cta?: unknown;
  price?: unknown; oldPrice?: unknown; offer?: unknown;
}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

/** Turkish money notation; reject ranges/ambiguous values instead of guessing. */
export function parseCampaignMoney(value: unknown): number | null {
  const raw = text(value).replace(/\s*\/\s*(?:m²|m2|kg|g|litre|lt|l|adet|kutu|paket)\s*$/i, '')
    .replace(/(?:₺|\bTL\b|\bTRY\b)/gi, '').trim()
  if (!raw || !/^\d+(?:[.,]\d+)*$/.test(raw)) return null
  let normalized: string
  if (raw.includes(',')) {
    if (!/^\d{1,3}(?:\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(raw)) return null
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) normalized = raw.replace(/\./g, '')
  else if (/^\d+(?:\.\d{1,2})?$/.test(raw)) normalized = raw
  else return null
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function campaignFactsError(input: CampaignFacts): string | null {
  const sales = ['SALES_OFFER', 'CAMPAIGN'].includes(text(input.objective))
  if (sales && !text(input.headline)) return 'Reklam başlığını yazın.'
  if (sales && !text(input.cta)) return 'Müşterinizi yönlendirecek çağrıyı yazın.'
  if (sales && !text(input.price) && !text(input.offer)) return 'Satış reklamı için fiyat veya doğruladığınız teklifi yazın.'
  const price = parseCampaignMoney(input.price), old = parseCampaignMoney(input.oldPrice)
  if (text(input.price) && price === null) return 'Fiyatı örneğin 1.250,00 TL biçiminde yazın.'
  if (text(input.oldPrice) && old === null) return 'Eski fiyatı örneğin 1.500,00 TL biçiminde yazın.'
  if (old !== null && price === null) return 'Eski fiyat için güncel fiyatı da yazın.'
  if (old !== null && price !== null && old <= price) return 'Eski fiyat güncel fiyattan yüksek olmalı.'
  const percent = text(input.offer).match(/%\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*%/)
  if (percent) {
    const claimed = Number((percent[1] || percent[2]).replace(',', '.'))
    if (claimed <= 0 || claimed >= 100) return 'İndirim oranı 0 ile 100 arasında olmalı.'
    if (price !== null && old !== null && Math.abs((1 - price / old) * 100 - claimed) > 0.5)
      return 'İndirim oranı eski ve güncel fiyatla uyuşmuyor. Fiyatları veya oranı düzeltin.'
  }
  return null
}
