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
 * Structured brief → 3-act cinematic commercial video prompt (Veo / AI Video).
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
  const brandName = kit?.name?.replace(/Brand Kit/i, '').replace(/Kampanya Kiti/i, '').trim() || 'Marka'
  const productName = mainProduct?.name || 'Ürün'
  const primaryColor = kit?.colors?.background || kit?.colors?.primary || '#026009'
  const accentColor = kit?.colors?.accent || '#acfe00'

  const prompt = [
    '9:16 dikey formatta profesyonel televizyon ve sosyal medya reklam filmi (Instagram Reels & WhatsApp Durum).',
    `Marka: ${brandName}. Ürün: ${productName}.`,
    mainProduct?.description ? `Ürün fonksiyonu ve detayları: ${mainProduct.description}.` : null,
    `Gövde renk paleti: ${primaryColor} kurumsal zemin ve ${accentColor} dinamik detaylar.`,
    `SAHNE 1 (0-3sn - ÜRÜN MAKRO GİRİŞİ): Kameranın aşırı yakın plan makro (100mm macro lens) odaklanması. Ürün gövdesinde '${brandName}' logosunun hassas işçiliği ve açma/çalıştırma düğmesi belirginleşiyor. Sinematik sığ alan derinliği (f/1.8), hafif lens parlaması.`,
    `SAHNE 2 (3-7sn - DİNAMİK EYLEM & PERFORMANS): Kamera akıcı gimbal hareketiyle bereketli bir tarım bahçesinde ürünü kullanan profesyonel kullanıcıya geçiyor. Ürünün nozulundan çıkan ultra ince mikro sis bulutu, altın saat (golden hour) gün batımı ışığında parıldıyor. 120fps ağır çekim su damlacıkları ve sinematik ışık süzülmeleri.`,
    `SAHNE 3 (7-10sn - KAHRAMAN KAPANIŞ): Kamera geriye doğru açılarak bereketli, yemyeşil doğayı ve ürünün kusursuz performansını geniş açıdan yakalıyor. 4K reklam ajansı estetiği, Arri Alexa sinema renk paleti, canlı ve sıcak renk tonları, sıfır yapaylık, fotogerçekçi reklam çekimi.`,
  ]
    .filter(Boolean)
    .join(' ')

  const negative =
    'no cartoon, no 3D animation look, no uncanny deformed hands, no floating disjointed objects, no blurry artifacts, no misspelled on-screen text, realistic live-action commercial'

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
      primaryColor,
      accentColor,
    },
  }
}
