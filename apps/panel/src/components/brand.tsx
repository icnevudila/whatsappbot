/**
 * Filo marka isareti.
 *
 * Bicim: giderek kisalan uc yatay cubuk (bosalan gonderim kuyrugu) ve
 * ustunde tek dolu nokta (aktif hat). Nokta kobalt accent: pilot-ui / Messora
 * marka aksaniyla ayni dil.
 */
export function LogoMark({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <circle cx="2.6" cy="2.6" r="2.2" className="fill-accent" />
      <rect x="0" y="6.6" width="16" height="1.7" rx="0.85" fill="currentColor" />
      <rect x="0" y="10" width="11" height="1.7" rx="0.85" fill="currentColor" opacity="0.72" />
      <rect x="0" y="13.4" width="6" height="1.7" rx="0.85" fill="currentColor" opacity="0.44" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="text-[13.5px] font-semibold tracking-[-0.02em]">Filo</span>
    </span>
  )
}

/** Tek yerden isim: degistirmek istendiginde yalnizca burasi degisir. */
export const BRAND_NAME = 'Filo'
export const BRAND_TAGLINE = 'Coklu WhatsApp hattindan toplu kampanya gonderimi'
