'use client'

import { useEffect, useState } from 'react'

/**
 * QR okutamayan kullanicilar icin telefon numarasiyla eslesme.
 *
 * WhatsApp kodu 8 karakter veriyor ve genelde ortadan tireli gosteriyor;
 * kullanici telefonda gordugu bicimle birebir eslesmesini bekliyor, o yuzden
 * biz de dortlu iki gruba ayirip harf araligini aciyoruz.
 */
export function PairingPanel({
  code,
  expiresAt,
}: {
  code: string
  expiresAt: string | null
}) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null)
      return
    }

    const update = () => {
      const remaining = Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)
      setSecondsLeft(Math.max(0, remaining))
    }

    update()
    const timer = setInterval(update, 1_000)
    return () => clearInterval(timer)
  }, [expiresAt])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      // Pano izni yoksa kod ekranda okunabilir durumda, sessiz geciyoruz.
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
            title="Kopyalamak icin tiklayin"
            className="rounded-md border border-hairline-strong bg-surface px-4 py-3 font-mono text-[26px] font-semibold tracking-[0.18em] text-accent transition-colors hover:border-accent/60"
          >
            {pretty}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-ink-faint">
            {copied ? 'Kopyalandi' : 'Kopyalamak icin tiklayin'}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">Bu kodu telefonunuza girin</p>
          <ol className="mt-2 space-y-1 text-[12.5px] text-ink-muted">
            <li>1. WhatsApp &gt; Ayarlar &gt; Bagli cihazlar</li>
            <li>2. &quot;Cihaz bagla&quot;ya dokunun</li>
            <li>
              3. Alttaki{' '}
              <span className="text-ink">&quot;Telefon numarasiyla bagla&quot;</span>{' '}
              secenegini kullanin
            </li>
            <li>4. Yukaridaki kodu girin</li>
          </ol>

          {secondsLeft !== null ? (
            <p className="mt-3 text-[11.5px] tabular">
              {secondsLeft > 0 ? (
                <span className="text-ink-faint">
                  Kod {Math.floor(secondsLeft / 60)}:
                  {String(secondsLeft % 60).padStart(2, '0')} sonra gecersiz olacak
                </span>
              ) : (
                <span className="text-danger">
                  Kodun suresi doldu, yeniden isteyin
                </span>
              )}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
