'use client'

import { useEffect, useRef } from 'react'
import { useBusy } from '@/components/busy'

type Stage = {
  at: number
  label: string
  detail: string
}

const IMAGE_TO_IMAGE_STAGES: Stage[] = [
  {
    at: 0,
    label: 'Marka kiti ve renk paleti analiz ediliyor…',
    detail: 'Kurumsal kimlik ve tasarım tonu parametreleri hazırlanıyor',
  },
  {
    at: 10,
    label: 'Görsel kompozisyonu ve ürün hatları taranıyor…',
    detail: 'Odak ürün ambalaj formu ve tasarım çizgileri optimize ediliyor',
  },
  {
    at: 25,
    label: 'Kampanya konsepti ve tipografi kurgulanıyor…',
    detail: 'Metin hiyerarşisi ve dikkat çekici görsel yerleşim tasarlanıyor',
  },
  {
    at: 46,
    label: 'Yüksek çözünürlüklü sahne render ediliyor…',
    detail: 'Stüdyo aydınlatması, gölgeler ve arka plan detayları işleniyor',
  },
  {
    at: 68,
    label: 'Afiş detayları ve renk dengesi tamamlanıyor…',
    detail: 'Görsel kontrastı ve son rötuşlar uygulanıyor',
  },
  {
    at: 82,
    label: 'Son kontroller yapılıyor ve kütüphaneye aktarılıyor…',
    detail: 'Ultra yüksek çözünürlüklü çıktı hazırlanıyor',
  },
]

const TEXT_ONLY_STAGES: Stage[] = [
  {
    at: 0,
    label: 'Marka kiti ve renk paleti analiz ediliyor…',
    detail: 'Kurumsal kimlik ve tasarım tonu parametreleri hazırlanıyor',
  },
  {
    at: 8,
    label: 'Kampanya konsepti ve tipografi kurgulanıyor…',
    detail: 'Metin hiyerarşisi ve dikkat çekici görsel yerleşim tasarlanıyor',
  },
  {
    at: 20,
    label: 'Yüksek çözünürlüklü sahne render ediliyor…',
    detail: 'Stüdyo aydınlatması, gölgeler ve arka plan detayları işleniyor',
  },
  {
    at: 36,
    label: 'Afiş detayları ve renk dengesi tamamlanıyor…',
    detail: 'Görsel kontrastı ve son rötuşlar uygulanıyor',
  },
  {
    at: 48,
    label: 'Son kontroller yapılıyor ve kütüphaneye aktarılıyor…',
    detail: 'Ultra yüksek çözünürlüklü çıktı hazırlanıyor',
  },
]

export function useCreativeGenerationProgress(active: boolean, isImageToImage = false) {
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

    const stages = isImageToImage ? IMAGE_TO_IMAGE_STAGES : TEXT_ONLY_STAGES
    const targetDuration = isImageToImage ? 78 : 46
    startTimeRef.current = Date.now()

    const update = () => {
      const elapsed = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000)

      // Geçen süreye göre en uygun aşamayı seç
      let currentStage = stages[0]
      for (let i = stages.length - 1; i >= 0; i--) {
        if (elapsed >= stages[i].at) {
          currentStage = stages[i]
          break
        }
      }

      // Kalan tahmini süreyi hesapla
      const remainingSeconds = Math.max(5, targetDuration - elapsed)
      const remainingText =
        elapsed >= targetDuration
          ? 'Birkaç saniye içinde tamamlanıyor'
          : `Tahmini kalan süre: ~${remainingSeconds} sn`

      const label = currentStage.label
      const detail = `${currentStage.detail} · ${remainingText}`

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
  }, [active, isImageToImage, setBusy, clearBusy])
}
