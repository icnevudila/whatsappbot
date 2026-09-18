import type { CreativeSnapshot } from './types'
import { CREATIVE_FORMATS, CREATIVE_STYLES, VARIATION_PRESETS } from './types'

const STYLE_HINT: Record<string, string> = {
  auto: 'Choose the most suitable commercial look from the brief, products and brand (do not invent a sector).',
  modern: 'Modern, clean commercial design, contemporary type hierarchy, generous spacing.',
  premium: 'Premium, refined, high-end campaign look, restrained palette, quality materials.',
  minimal: 'Minimal, lots of whitespace, few elements, one focal product or offer.',
  energetic: 'Energetic, high contrast, bold shapes, still readable on a phone.',
  fun: 'Playful but professional, not childish, still conversion-oriented.',
  corporate: 'Corporate, trustworthy, calm, no visual noise.',
  luxury: 'Luxury, elegant lighting, sparse composition, no clutter.',
  food: 'Appetizing food photography mood, warm light, steam/freshness if relevant, no fake ingredients.',
}

const DENSITY_HINT: Record<string, string> = {
  low: 'Very little on-image text: at most a short headline. No paragraphs, no tiny disclaimers.',
  balanced: 'Limited on-image text: headline + one short offer line. No long body copy. Keep mobile-readable.',
  detailed:
    'More campaign text is allowed (headline, offer, one contact line) but still sparse. Never fill the image with paragraphs.',
}

function formatLabel(formatId: string): string {
  return CREATIVE_FORMATS.find((row) => row.id === formatId)?.label ?? formatId
}

function styleLabel(styleId: string): string {
  return CREATIVE_STYLES.find((row) => row.id === styleId)?.label ?? styleId
}

/**
 * Structured brief → image-model prompt. UI içinde prompt birleştirilmez.
 */
export function buildCreativePrompt(snapshot: CreativeSnapshot): {
  prompt: string
  negative: string
} {
  const aspect =
    CREATIVE_FORMATS.find((row) => row.id === snapshot.formatId)?.aspect ?? snapshot.aspect
  const kit = snapshot.brandKit
  const colors = kit?.colors
    ? Object.entries(kit.colors)
        .filter(([, value]) => typeof value === 'string' && value)
        .map(([key, value]) => `${key} ${value}`)
        .join(', ')
    : null

  const productBlocks = snapshot.products.map((product, index) => {
    const bits: string[] = [`Product ${index + 1}`]
    if (product.include.name && product.name) bits.push(`name: ${product.name}`)
    if (product.include.description && product.description) bits.push(`description: ${product.description}`)
    if (product.include.boxContents && product.boxContents) {
      bits.push(`box contents: ${product.boxContents}`)
    }
    if (product.include.price && (product.price || product.oldPrice)) {
      bits.push(
        `price: ${product.price || '—'} ${product.oldPrice ? `(was ${product.oldPrice})` : ''}`.trim(),
      )
    }
    if (product.include.promo && product.promo) bits.push(`offer: ${product.promo}`)
    if (product.extra) bits.push(`extra: ${product.extra}`)
    if (!snapshot.baseCreativeId && product.include.image && product.imageUrl && index === 0) {
      bits.push('A product photo is attached as a reference. Keep the real product identity.')
    }
    return bits.join('. ')
  })

  const contacts: string[] = []
  for (const phone of snapshot.phones) {
    contacts.push(`Phone/WhatsApp: ${phone.phone}${phone.label ? ` (${phone.label})` : ''}`)
  }
  for (const social of snapshot.socials) {
    const handle = social.label || social.url
    contacts.push(`${social.platform}: ${handle}`)
  }
  if (snapshot.website) contacts.push(`Website: ${snapshot.website}`)
  if (snapshot.address) contacts.push(`Address: ${snapshot.address}`)

  const extras: string[] = []
  if (snapshot.labels.length) extras.push(`Badges/labels to feature: ${snapshot.labels.join(', ')}`)
  if (snapshot.cta) extras.push(`CTA: ${snapshot.cta}`)
  if (snapshot.dateRange) extras.push(`Campaign dates: ${snapshot.dateRange}`)
  if (snapshot.customText) extras.push(`Custom line: ${snapshot.customText}`)

  const variation = snapshot.variationPreset
    ? VARIATION_PRESETS.find((row) => row.id === snapshot.variationPreset)?.label
    : null

  const prompt = [
    'Create ONE professional commercial campaign creative for WhatsApp / social ads.',
    'Turkish audience. High quality, sharp, mobile-first, no watermarks, no stock-photo logos.',
    `Use case: ${formatLabel(snapshot.formatId)} (${aspect}).`,
    `Visual style: ${styleLabel(snapshot.style)}. ${STYLE_HINT[snapshot.style] ?? STYLE_HINT.auto}`,
    DENSITY_HINT[snapshot.textDensity] ?? DENSITY_HINT.balanced,
    kit?.tone ? `Brand tone of voice: ${kit.tone}` : null,
    colors ? `Follow this brand palette in backgrounds, accents and props: ${colors}.` : null,
    kit?.fonts?.heading ? `Prefer a ${kit.fonts.heading}-like heading feel.` : null,
    'Do NOT write internal labels on the image: never paint brand-kit titles, "marka kiti", "brand kit", "kampanya kiti", or similar meta text.',
    snapshot.useLogo
      ? 'A real company logo image is attached as a reference. Place that exact logo cleanly (usually a corner), keep proportions, transparent/white-friendly. Do not invent a different logo. Do not replace the logo with typed brand-name text.'
      : 'Do not invent fake logos. Do not type a brand name as a fake logo unless the advertiser brief explicitly asks for the business name as headline text.',
    snapshot.baseCreativeId
      ? 'A base/reference campaign image is attached. Keep the same product and brand identity; apply the requested change.'
      : null,
    snapshot.instruction ? `Revision instruction (must follow): ${snapshot.instruction}` : null,
    variation ? `Variation direction: ${variation}. Same offer, different composition.` : null,
    `Campaign brief from the advertiser (do not add facts they did not give): ${snapshot.brief}`,
    productBlocks.length ? `Products:\n${productBlocks.join('\n')}` : 'No specific product catalog items.',
    contacts.length
      ? `Contact lines that may appear on the creative if text is used: ${contacts.join(' · ')}`
      : null,
    extras.length ? extras.join(' ') : null,
    'Do not invent prices, discounts, slogans, dates, product names or brand claims that are not in this brief.',
    'Do not replace products with different products. Preserve packaging and product shape from reference photos.',
    'Clean visual hierarchy. One focal offer. Not cluttered. Readable on a phone screen.',
  ]
    .filter(Boolean)
    .join('\n')

  const negative = [
    'no extra products that were not listed',
    'no fake logos',
    'no unreadable micro-text',
    'no watermarks',
    'no misspelled brand names',
    'no text saying marka kiti',
    'no text saying brand kit',
    'no campaign kit title overlays',
  ].join(', ')

  return { prompt, negative }
}

/**
 * Structured brief → Pure cinematic 3-act live-action commercial video prompt (Veo / AI Video).
 * Guaranteed ZERO on-screen text, ZERO logo cards, ZERO graphic overlays.
 */
export function buildVideoPrompt(snapshot: CreativeSnapshot): {
  prompt: string
  negative: string
  overlay: {
    brandName: string
    subTitle?: string
    offerTitle?: string
    offerDetails?: string
    ctaText?: string
    primaryColor?: string
    accentColor?: string
  }
} {
  const kit = snapshot.brandKit
  const mainProduct = snapshot.products[0]
  const brandName = kit?.name?.replace(/Brand Kit/i, '').replace(/Kampanya Kiti/i, '').trim() || ''
  const productName = mainProduct?.name || 'Ürün'
  const productDesc = mainProduct?.description || snapshot.brief || 'Ticari ürün'

  const prompt = [
    `9:16 dikey formatta profesyonel televizyon ve sosyal medya reklam filmi (Instagram Reels & WhatsApp Durum).`,
    `Ürün ve Konu: ${productName}.`,
    productDesc ? `Ürün Detayları: ${productDesc}.` : null,
    snapshot.brief ? `Reklam Senaryosu: ${snapshot.brief}.` : null,
    `SAHNE 1 (0-3sn - MAKRO BAŞLANGIÇ): Kameranın aşırı yakın plan makro (100mm macro lens) odaklanması. ${productName} yüzeyindeki doğal malzeme dokusu, birinci sınıf işçilik ve kusursuz detaylar. Sinematik sığ alan derinliği (f/1.8), zarif ışık kırılmaları.`,
    `SAHNE 2 (3-7sn - DİNAMİK KULLANIM): Kamera akıcı gimbal hareketiyle ${productName} ürününün gerçek ortamındaki işlevini, kalitesini ve profesyonel uygulamasını yakalıyor. Doğal gün ışığında 120fps sinematik hareketler.`,
    `SAHNE 3 (7-10sn - KAHRAMAN KAPANIŞ): Kamera geriye doğru açılarak sahneyi geniş açıdan kahraman (hero) planında yakalıyor. 4K reklam ajansı estetiği, Arri Alexa sinema renk tonları, kusursuz fotogerçekçi canlı çekim.`,
    `ÖNEMLİ KURAL: Videoda KESİNLİKLE hiçbir yazı, metin, altyazı, logo kartı, bilgi kutusu veya grafik overlay OLMAYACAKTIR. Ekranda sadece %100 saf, temiz ve sinematik canlı çekim video görüntüsü olacaktır. Tam ekran temiz sinema karesi.`,
    `STRICT RULE: NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO SUBTITLES, NO CAPTIONS, NO ON-SCREEN TEXT, NO LOGO CARDS, NO GRAPHIC OVERLAYS, NO BANNERS, NO LOWER THIRDS. Pure clean cinematic live-action commercial footage only.`,
  ]
    .filter(Boolean)
    .join(' ')

  const negative =
    'text, words, letters, typography, watermark, logo overlay, graphic box, lower third, subtitles, captions, banner, card, cartoon, 3D animation look, deformed hands, blurry artifacts'

  const offerTitle = snapshot.brief || 'ÖZEL KAMPANYA'
  const offerDetails =
    mainProduct?.promo || (mainProduct?.price ? `Fiyat: ${mainProduct.price}` : snapshot.customText || '')
  const ctaText =
    snapshot.cta ||
    (snapshot.phones?.[0]?.phone ? `WHATSAPP: ${snapshot.phones[0].phone}` : 'WHATSAPP SIPARIS HATTI')

  return {
    prompt,
    negative,
    overlay: {
      brandName,
      subTitle: kit?.tone ? kit.tone.slice(0, 35) : 'Yetkili Satış & Sipariş',
      offerTitle,
      offerDetails,
      ctaText,
      primaryColor: kit?.colors?.background || kit?.colors?.primary || '#026009',
      accentColor: kit?.colors?.accent || '#acfe00',
    },
  }
}
