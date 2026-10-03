export function requiredImageAssets(input: {
  useLogo: boolean; hasLogo: boolean; hasProductReference: boolean; hasValidBase: boolean
}) {
  if (!input.useLogo || !input.hasLogo) return {
    ready: false, code: 'IMAGE_LOGO_REQUIRED', message: 'Üretmek için işletme logosunu ekleyin ve logo kullanımını açın.',
  }
  if (!input.hasProductReference && !input.hasValidBase) return {
    ready: false, code: 'IMAGE_PRODUCT_REFERENCE_REQUIRED', message: 'Üretmek için gerçek bir ürün veya referans görseli seçin.',
  }
  return {ready:true,code:null,message:null}
}
