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
      src="/logos/mesajify_app_icon_corporate_squircle.png"
      alt={BRAND_NAME}
      className={`${className} rounded-md object-contain shadow-xs inline-block`}
    />
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-6" />
      <span className="text-[14px] font-bold tracking-tight text-ink">{BRAND_NAME}</span>
    </span>
  )
}
