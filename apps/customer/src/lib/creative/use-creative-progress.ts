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
    label: 'Marka kiti ve referans varlıklar hazırlanıyor…',
    detail: 'Logo ve odak ürün hatları kompozisyona bağlanıyor',
  },
  {
    at: 10,
    label: 'Görsel kompozisyonu kurgulanıyor…',
    detail: 'Tasarım hiyerarşisi ve tipografi düzeni oluşturuluyor',
  },
  {
    at: 25,
    label: 'Yapay zeka görsel motoru çalışıyor…',
    detail: 'Stüdyo aydınlatması ve sahne detayları işleniyor',
  },
  {
    at: 50,
    label: 'Görsel işleme devam ediyor…',
    detail: 'Yüksek çözünürlüklü detaylar işleniyor, lütfen bekleyin',
  },
  {
    at: 80,
    label: 'İşlem sürüyor…',
    detail: 'Yapay zeka sağlayıcısından yanıt bekleniyor',
  },
]

const TEXT_ONLY_STAGES: Stage[] = [
  {
    at: 0,
    label: 'Kampanya konsepti hazırlanıyor…',
    detail: 'Metin parametreleri ve tasarım tonu kurgulanıyor',
  },
  {
    at: 10,
    label: 'Yapay zeka görsel motoru çalışıyor…',
    detail: 'Sahne ve kompozisyon işleniyor',
  },
  {
    at: 30,
    label: 'Görsel işleme devam ediyor…',
    detail: 'Yüksek çözünürlüklü detaylar işleniyor, lütfen bekleyin',
  },
  {
    at: 60,
    label: 'İşlem sürüyor…',
    detail: 'Yapay zeka sağlayıcısından yanıt bekleniyor',
  },
]

export const VIDEO_CAMPAIGN_STAGES: Stage[] = [
  {
    at: 0,
    label: 'Senaryo ve görsel kompozisyon planlanıyor…',
    detail: 'Marka kimliği, ürün açıları ve seslendirme metni kurgulanıyor',
  },
  {
    at: 12,
    label: 'Google Veo AI video motoru çalışıyor…',
    detail: 'Kurumsal logo ve ürün görseli sinematik sahneye bağlanıyor',
  },
  {
    at: 35,
    label: 'Bulut GPU üzerinde video işleniyor…',
    detail: 'Yüksek kaliteli yapay zeka video karesi üretiliyor (~90-120 sn)',
  },
  {
    at: 75,
    label: 'Akıllı altyazı ve ses miksajı senkronlanıyor…',
    detail: 'Altyazı ve seslendirme katmanları birleştiriliyor',
  },
  {
    at: 105,
    label: 'Video render devam ediyor…',
    detail: 'İşlem sürüyor, lütfen sayfayı kapatmayın',
  },
]

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

    const stages = isVideo
      ? VIDEO_CAMPAIGN_STAGES
      : isImageToImage
        ? IMAGE_TO_IMAGE_STAGES
        : TEXT_ONLY_STAGES
    const targetDuration = isVideo ? 120 : isImageToImage ? 70 : 45
    startTimeRef.current = Date.now()

    const update = () => {
      const elapsed = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000)

      // Geçen süreye göre uygun aşama metnini seç
      let currentStage = stages[0]
      for (let i = stages.length - 1; i >= 0; i--) {
        if (elapsed >= stages[i].at) {
          currentStage = stages[i]
          break
        }
      }

      const statusText =
        elapsed >= targetDuration
          ? `İşlem beklenenden uzun sürüyor (${elapsed} sn) · Sağlayıcı yanıtı bekleniyor`
          : `Geçen süre: ${elapsed} sn · Tahmini: ~${targetDuration} sn`

      const label = currentStage.label
      const detail = `${currentStage.detail} · ${statusText}`

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
