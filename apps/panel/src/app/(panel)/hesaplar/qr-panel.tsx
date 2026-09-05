'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useCountdown } from '@/lib/use-countdown'

/**
 * Baileys QR'ı ~60 saniyede bir yenilenir.
 * Kalan süre gösterilmezse kullanıcı süresi geçmiş kodu okutup "çalışmıyor" der.
 */
export function QrPanel({
  qr,
  expiresAt,
}: {
  qr: string
  expiresAt: string | null
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const secondsLeft = useCountdown(expiresAt)

  useEffect(() => {
    let cancelled = false

    void QRCode.toDataURL(qr, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: { dark: '#000000', light: '#ffffff' },
    }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })

    return () => {
      cancelled = true
    }
  }, [qr])

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-hairline bg-canvas p-4 sm:flex-row sm:items-start">
      <div className="size-[196px] shrink-0 overflow-hidden rounded-md border border-hairline-strong bg-white p-2">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="WhatsApp QR kodu" className="size-full" />
        ) : (
          <div className="grid size-full place-items-center text-[11.5px] text-ink-faint">
            Hazırlanıyor…
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">Telefonunuzdan QR kodunu okutun</p>
        <ol className="mt-2 space-y-1 text-[12.5px] text-ink-muted">
          <li>1. WhatsApp → Ayarlar → Bağlı cihazlar</li>
          <li>2. “Cihaz bağla”ya dokunun</li>
          <li>3. Bu QR kodunu telefonunuzla okutun</li>
        </ol>

        {secondsLeft !== null ? (
          <p className="mt-3 text-[11.5px] text-ink-faint tabular">
            {secondsLeft > 0
              ? `Kod ${secondsLeft} saniye sonra yenilenecek`
              : 'Yeni kod bekleniyor…'}
          </p>
        ) : null}
      </div>
    </div>
  )
}
