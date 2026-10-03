'use client'

import { useEffect, useRef } from 'react'
import { useBusy } from '@/components/busy'

/**
 * Müşteri arayüzü görsel üretim ilerleme animasyonu.
 * DİKKAT: Bu hook ASLA sahte "tamamlandı / kütüphaneye aktarılıyor" gibi
 * backend durumunu taklit eden sahte state basamaz.
 * Durum yalnızca backend authoritative yanıtlarıyla değişir.
 */
export function useCreativeGenerationProgress(
  active: boolean,
  isImageToImage = false,
  isVideo = false,
) {
  const { setBusy, clearBusy } = useBusy()
  const busyIdRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      if (busyIdRef.current != null) {
        clearBusy(busyIdRef.current)
        busyIdRef.current = null
      }
      startTimeRef.current = null
      return
    }

    startTimeRef.current = Date.now()

    const update = () => {
      const elapsed = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000)

      // A timer may report elapsed time, never invent a provider/persistence stage.
      const label = isVideo ? 'Video isteği işleniyor…' : 'Görsel isteği işleniyor…'
      const detail = `Sunucudan sonuç bekleniyor · Geçen süre: ${elapsed} sn`

      if (busyIdRef.current != null) {
        clearBusy(busyIdRef.current)
      }
      busyIdRef.current = setBusy(label, detail)
    }

    update()
    const timer = setInterval(update, 1000)

    return () => {
      clearInterval(timer)
      if (busyIdRef.current != null) {
        clearBusy(busyIdRef.current)
        busyIdRef.current = null
      }
      startTimeRef.current = null
    }
  }, [active, isImageToImage, isVideo, setBusy, clearBusy])
}
