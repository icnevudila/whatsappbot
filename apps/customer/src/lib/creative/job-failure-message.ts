/** Raw worker exceptions belong in operator logs, never in customer-facing text. */
export function videoFailureUserMessage(raw: string | null | undefined): string {
  const safeMessages = [
    'Ürün görseli işletme logosuyla aynı. Gerçek ürün veya arayüz görseli seçip tekrar deneyin.',
    'Logo veya ürün görseli üretime aktarılamadı. Görselleri kontrol edip tekrar deneyin.',
    'Video üretim hakkı kullanılamıyor. Hesabınızı kontrol edin.',
    'Üretim hizmeti şu anda hazır değil. Daha sonra tekrar deneyin.',
  ]
  if (raw && safeMessages.includes(raw)) return raw
  if (/PRODUCT_REFERENCE_IS_LOGO/.test(raw || '')) {
    return 'Ürün görseli işletme logosuyla aynı. Gerçek ürün veya arayüz görseli seçip tekrar deneyin.'
  }
  if (/MATERIALIZE_FAILED|ASSET_|INGREDIENT|REFERENCE|Asset count/.test(raw || '')) {
    return 'Logo veya ürün görseli üretime aktarılamadı. Görselleri kontrol edip tekrar deneyin.'
  }
  if (/QUOTA|CREDIT/.test(raw || '')) return 'Video üretim hakkı kullanılamıyor. Hesabınızı kontrol edin.'
  if (/AUTH_REQUIRED|UNAUTHENTICATED/.test(raw || '')) return 'Üretim hizmeti şu anda hazır değil. Daha sonra tekrar deneyin.'
  return 'Video üretimi tamamlanamadı. Tekrar deneyebilir veya içerik kütüphanesine dönebilirsiniz.'
}
