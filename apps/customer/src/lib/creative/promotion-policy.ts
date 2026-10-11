/** Explicit creative subject; a logo is never a catalog product. */
export type PromotionMode = 'offering' | 'brand'
export type OfferingKind = 'physical' | 'software' | 'service'

export const BRAND_VIDEO_UNAVAILABLE = 'Yalnız logoyla marka videosu mevcut video sağlayıcısında desteklenmiyor. Marka tanıtımı için görsel oluşturabilir veya ürün/hizmet videosunda ayrı bir gerçek görsel seçebilirsiniz.'

export function promotionMode(value: unknown): PromotionMode {
  return value === 'brand' ? 'brand' : 'offering'
}

export function offeringKind(value: unknown): OfferingKind {
  return value === 'software' || value === 'service' ? value : 'physical'
}

export function promotionPolicyError(input: {
  mode: PromotionMode; video: boolean; hasLogo: boolean; hasOfferingReference: boolean;
  hasOfferingSelection: boolean; hasBase: boolean
}): string | null {
  if (!input.hasLogo) return 'İşletme logosunu ekleyin ve logo kullanımını açın.'
  if (input.mode === 'brand') {
    if (input.video) return BRAND_VIDEO_UNAVAILABLE
    if (input.hasOfferingSelection || input.hasBase) return 'Marka tanıtımında ürün veya kaynak reklam seçilmez. Yalnız işletme kimliği ve logosu kullanılır.'
    return null
  }
  if (!input.hasOfferingReference) return 'Ürün fotoğrafı, gerçek arayüz ekran görüntüsü veya hizmet/çalışma görseli seçin. Logo bu görselin yerine kullanılamaz.'
  return null
}
