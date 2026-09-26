import { createHash } from 'node:crypto'

export type Suggestion = { label: string; text: string }

export function normalizeForLibrary(input: string): string {
  return input
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
}

export function fingerprint(input: string): string {
  return createHash('sha256').update(normalizeForLibrary(input)).digest('hex')
}

export function extractSemanticIntentKey(input: string): string | null {
  const norm = normalizeForLibrary(input)
  if (!norm) return null

  // Fiyat / Maliyet sorgusu
  if (/\b(fiyat|fiyati|fiyatlar|fiyatlari|ucret|ucreti|kac\s*tl|kac\s*para|ne\s*kadar|maliyet|tarife)\b/u.test(norm)) {
    return 'intent:fiyat_sorgusu'
  }

  // Konum / Adres sorgusu
  if (/\b(konum|adres|adresi|nerede|neredesiniz|yeriniz|yeriniz\s*nerede|harita|tarifi|nasil\s*gelirim)\b/u.test(norm)) {
    return 'intent:konum_adres'
  }

  // Stok / Ürün temin
  if (/\b(var\s*mi|elinizde\s*var\s*mi|stok|stokta|stokta\s*var\s*mi|temin|mevcut\s*mu|bulunur\s*mu)\b/u.test(norm)) {
    return 'intent:stok_temin'
  }

  // Kargo / Teslimat
  if (/\b(kargo|kargoya|teslimat|ne\s*zaman\s*gelir|kac\s*gunde|kargom|takip)\b/u.test(norm)) {
    return 'intent:kargo_teslimat'
  }

  // Selamlaşma
  if (/\b(merhaba|selam|selamlar|gunaydin|iyi\s*gunler|kolay\s*gelsin|iyi\s*calismalar|iyi\s*aksamlar)\b/u.test(norm)) {
    return 'intent:selamlasma'
  }

  return null
}

export function generateSmartFallbackSuggestions(incoming: string, company?: string): Suggestion[] {
  const norm = (incoming || '').toLowerCase()
  const comp = company || 'işletmemiz'

  if (
    norm.includes('fiyat') ||
    norm.includes('ne kadar') ||
    norm.includes('ücret') ||
    norm.includes('ucret') ||
    norm.includes('kac') ||
    norm.includes('kaç') ||
    norm.includes('maliyet')
  ) {
    return [
      {
        label: 'Kısa & Net',
        text: 'Merhabalar, ilgilendiğiniz ürün veya hizmet detayını iletirseniz hemen güncel fiyat bilgisi paylaşalım.',
      },
      {
        label: 'Samimi',
        text: 'Merhabalar, memnuniyetle yardımcı oluruz! Tam olarak hangi model veya ürünümüzün fiyatını öğrenmek istemiştiniz?',
      },
      {
        label: 'Yönlendirici',
        text: 'Merhaba, güncel fiyat listemizi ve kampanyalı tekliflerimizi iletebilmemiz için ürün görseli veya adını paylaşabilir misiniz?',
      },
    ]
  }

  if (
    norm.includes('konum') ||
    norm.includes('nerede') ||
    norm.includes('adres') ||
    norm.includes('yeriniz') ||
    norm.includes('tarifi')
  ) {
    return [
      {
        label: 'Kısa & Net',
        text: 'İşletmemiz Mamak, Ankara adresindedir. WhatsApp üzerinden harita konumumuzu hemen iletiyoruz.',
      },
      {
        label: 'Samimi',
        text: "Merhabalar, yerimiz Mamak / Ankara'da bulunuyor. Dilerseniz hemen canlı navigasyon pini gönderebilirim.",
      },
      {
        label: 'Yönlendirici',
        text: 'Merhaba, Mamak Ankara adresindeyiz. Ziyaretinizden memnuniyet duyarız; doğrudan konum pini gönderelim mi?',
      },
    ]
  }

  if (
    norm.includes('var mi') ||
    norm.includes('var mı') ||
    norm.includes('stok') ||
    norm.includes('mevcut') ||
    norm.includes('temin')
  ) {
    return [
      {
        label: 'Kısa & Net',
        text: 'Merhabalar, ürünümüz stoklarımızda mevcuttur. Dilediğiniz adette hızlı gönderim sağlayabiliriz.',
      },
      {
        label: 'Samimi',
        text: 'Merhabalar, evet ürünümüz hazır stoklarımızda bulunuyor! İhtiyacınız olan adedi belirtirseniz hemen ayıralım.',
      },
      {
        label: 'Yönlendirici',
        text: 'Merhaba, stoklarımız düzenli güncellenmektedir. Sipariş vermek istediğiniz miktar ve teslimat bölgesini iletirseniz hemen kontrol edelim.',
      },
    ]
  }

  if (
    norm.includes('merhaba') ||
    norm.includes('selam') ||
    norm.includes('günaydın') ||
    norm.includes('gunaydin') ||
    norm.includes('iyi günler') ||
    norm.includes('kolay gelsin') ||
    norm.includes('iyi çalışmalar')
  ) {
    return [
      {
        label: 'Kısa & Net',
        text: `Merhabalar, ${comp} olarak hoş geldiniz. Size nasıl yardımcı olabiliriz?`,
      },
      {
        label: 'Samimi',
        text: 'Merhabalar, hoş geldiniz! Size yardımcı olmaktan mutluluk duyarız, nasıl bir konuda destek istersiniz?',
      },
      {
        label: 'Yönlendirici',
        text: 'İyi günler dileriz. Ürünlerimiz, siparişleriniz veya hizmetlerimiz hakkında detaylı bilgi almak için sorunuzu iletebilirsiniz.',
      },
    ]
  }

  return [
    {
      label: 'Kısa & Net',
      text: `Mesajınız tarafımıza ulaştı. ${comp} olarak talebinizle ilgili en kısa sürede detaylı bilgi veriyoruz.`,
    },
    {
      label: 'Samimi',
      text: 'Merhabalar, mesajınız için teşekkür ederiz. Konuyla ilgili kontrolü sağlayıp hemen size dönüş yapıyoruz.',
    },
    {
      label: 'Yönlendirici',
      text: 'Talebinizi aldık. Size daha hızlı yardımcı olabilmemiz için ürün adı, görsel veya sipariş detayınızı iletebilir misiniz?',
    },
  ]
}
