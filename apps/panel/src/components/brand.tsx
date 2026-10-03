/**
 * Mesajify marka isareti.
 *
 * Bicim: giderek kisalan uc yatay cubuk (bosalan gonderim kuyrugu) ve
 * ustunde tek dolu nokta (aktif hat). Nokta kobalt accent: pilot-ui / Messora
 * marka aksaniyla ayni dil.
 */
export const BRAND_NAME = 'Mesajify'
export const BRAND_TAGLINE = 'Çoklu WhatsApp hattından toplu kampanya gönderimi'

export function LogoMark({ className = 'size-5' }: { className?: string }) {
  return (
    <img
      src="/brand/mesajify-symbol.png"
      alt={BRAND_NAME}
      className={`${className} object-contain inline-block`}
    />
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <img
      src="/brand/mesajify-logo-full.png"
      alt={BRAND_NAME}
      className={`h-7 w-auto object-contain inline-block ${className}`}
    />
  )
}
