'use client'

import { useState } from 'react'
import { useCountdown } from '@/lib/use-countdown'

/**
 * QR okutamayan kullanıcılar için telefon numarasıyla eşleşme.
 * WhatsApp 8 karakter verir; telefonda görünen 4-4 biçimiyle gösteriyoruz.
 */
export function PairingPanel({
  code,
  expiresAt,
}: {
  code: string
  expiresAt: string | null
}) {
  const secondsLeft = useCountdown(expiresAt)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      // Pano izni yoksa kod ekranda okunabilir.
    }
  }

  const pretty = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code

  return (
    <div className="rounded-md border border-hairline bg-canvas p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => void copy()}
            title="Kopyalamak için tıklayın"
            className="rounded-md border border-hairline-strong bg-surface px-4 py-3 font-mono text-[26px] font-semibold tracking-[0.18em] text-accent transition-colors hover:border-accent/60"
          >
            {pretty}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-ink-faint">
            {copied ? 'Kopyalandı' : 'Kopyalamak için tıklayın'}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">Bu kodu telefonunuza girin</p>
          <ol className="mt-2 space-y-1 text-[12.5px] text-ink-muted">
            <li>1. WhatsApp → Ayarlar → Bağlı cihazlar</li>
            <li>2. “Cihaz bağla”ya dokunun</li>
            <li>
              3. Alttaki{' '}
              <span className="text-ink">“Telefon numarasıyla bağla”</span>{' '}
              seçeneğini seçin
            </li>
            <li>4. Yukarıdaki kodu girin</li>
          </ol>

          {secondsLeft !== null ? (
            <p className="mt-3 text-[11.5px] tabular">
              {secondsLeft > 0 ? (
                <span className="text-ink-faint">
                  Kod {Math.floor(secondsLeft / 60)}:
                  {String(secondsLeft % 60).padStart(2, '0')} sonra geçersiz olacak
                </span>
              ) : (
                <span className="text-danger">
                  Kodun süresi doldu, yeniden isteyin
                </span>
              )}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
