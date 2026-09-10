'use client'

import { useEffect, useState } from 'react'

/**
 * `expiresAt` anina kalan saniye sayisi. Tarih yoksa null.
 *
 * Kalan sureyi state'te TUTMUYOR, her render'da yeniden hesapliyor; state'te
 * yalnizca "bir saniye gecti" tetikleyicisi duruyor. Iki faydasi var:
 *
 * 1. Sure ile `expiresAt` birbirinden ayrisamiyor. State'te tutuldugunda
 *    prop degistigi anda bir kare boyunca eski geri sayim gorunuyordu --
 *    QR 60 saniyede bir yenilendigi icin bu goze carpan bir hataydi.
 * 2. Efekt govdesinde senkron setState yok; React bunu onermiyor cunku
 *    ardisik render turlari tetikliyor.
 */
export function useCountdown(expiresAt: string | null): number | null {
  // Simdiki zaman state'te tutuluyor. Render sirasinda Date.now() okumak
  // React'in saflik kuralini bozuyor: ayni girdiyle farkli cikti ureten bir
  // render, React'in ciktiyi yeniden kullanabilmesi varsayimini gecersiz
  // kiliyor.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return

    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [expiresAt])

  if (!expiresAt) return null

  // `now` prop degistigi anda en fazla bir saniye bayat olabiliyor. Geri
  // sayim gostergesi icin bu farkin bir onemi yok; efekt govdesinde senkron
  // setState yapip ardisik render tetiklemekten iyi.
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000))
}
