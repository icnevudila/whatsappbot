import type { CreativePayload } from './types'

export type CampaignCreativeHandoff = {
  creativeId: string
  mediaUrl: string
  messageType: 'image' | 'video'
  name: string
  body: string
  brief: string
}

/** Only persisted campaign facts are carried across; no inferred offers or contacts. */
export function campaignBriefFromSnapshot(snapshot: Partial<CreativePayload>): string {
  return [
    snapshot.companyName && `Firma: ${snapshot.companyName}`,
    snapshot.companyAbout && `Firma bilgisi: ${snapshot.companyAbout}`,
    snapshot.brandKit?.name && `Marka: ${snapshot.brandKit.name}`,
    snapshot.brandKit?.tone && `Marka tonu: ${snapshot.brandKit.tone}`,
    snapshot.brief,
    ...(snapshot.products ?? []).flatMap(product => [
      `Ürün: ${product.name}`,
      product.description && `Ürün açıklaması: ${product.description}`,
      product.price && `Fiyat: ${product.price}`,
      product.oldPrice && `Eski fiyat: ${product.oldPrice}`,
      product.promo && `Teklif / indirim: ${product.promo}`,
      product.boxContents && `Kutu içeriği: ${product.boxContents}`,
      product.extra,
    ]),
    ...(snapshot.primaryBenefits ?? []).map(benefit => `Özellik: ${benefit}`),
    snapshot.deliveryInfo && `Teslimat: ${snapshot.deliveryInfo}`,
    snapshot.stockInfo && `Stok: ${snapshot.stockInfo}`,
    snapshot.urgencyInfo && `Geçerlilik: ${snapshot.urgencyInfo}`,
    snapshot.cta && `CTA: ${snapshot.cta}`,
    snapshot.dateRange && `Kampanya tarihi: ${snapshot.dateRange}`,
    snapshot.address && `Adres: ${snapshot.address}`,
    snapshot.website && `Web: ${snapshot.website}`,
    ...(snapshot.phones ?? []).map(contact => `${contact.label}: ${contact.phone}`),
    ...(snapshot.socials ?? []).map(contact => `${contact.platform}: ${contact.url}`),
    snapshot.customText,
  ].filter(Boolean).join('\n')
}
