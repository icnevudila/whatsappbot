'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

interface CreativeItem {
  id: string
  tabLabel: string
  title: string
  brandName: string
  logo: string
  source: string
  video: string
  poster: string
  sourceLabel: string
  ctaText: string
  headline: string
}

const CREATIVE_ITEMS: CreativeItem[] = [
  {
    id: 'sneaker',
    tabLabel: 'Spor Giyim',
    title: 'Nike Air Flyknit Sneaker',
    brandName: 'Nike Sportswear',
    logo: '/landing/studio/sources/nike_logo.png',
    source: '/landing/studio/sources/nike_sneaker_raw.jpg',
    video: '/landing/studio/ecommerce-flow-veo.mp4',
    poster: '/landing/studio/ecommerce-flow-veo-poster.jpg',
    sourceLabel: 'Akıllı telefonla çekilmiş amatör ürün fotoğrafı',
    ctaText: "WhatsApp'ta İncele",
    headline: 'Yeni Sezon Spor Koleksiyonu',
  },
  {
    id: 'burger',
    tabLabel: 'Restoran & Menü',
    title: 'Gourmet Smash Cheeseburger',
    brandName: 'Burger Lab Artisan',
    logo: '/landing/studio/sources/burger_logo.png',
    source: '/landing/studio/sources/burger_raw.jpg',
    video: '/landing/studio/restaurant-flow-veo.mp4',
    poster: '/landing/studio/restaurant-flow-veo-poster.jpg',
    sourceLabel: 'Mutfak tezgahında çekilmiş menü karesi',
    ctaText: 'WhatsApp ile Sipariş Ver',
    headline: 'Özel Gurme Artisan Menü',
  },
  {
    id: 'car',
    tabLabel: 'Otomotiv & Galeri',
    title: 'Porsche Panamera GTS',
    brandName: 'Veloce Motors',
    logo: '/landing/studio/sources/car_logo.png',
    source: '/landing/studio/sources/car_raw.jpg',
    video: '/landing/studio/automotive-flow-veo.mp4',
    poster: '/landing/studio/automotive-flow-veo-poster.jpg',
    sourceLabel: 'Showroom zemininde doğal telefon çekimi',
    ctaText: 'Test Sürüşü Randevusu Al',
    headline: 'VIP Lansman & Test Sürüşü',
  },
  {
    id: 'realestate',
    tabLabel: 'Gayrimenkul',
    title: 'Modern Bahçeli Lüks Villa',
    brandName: 'Apex Real Estate',
    logo: '/landing/studio/sources/realestate_logo.svg',
    source: '/landing/studio/sources/realestate_product.jpg',
    video: '/landing/studio/realestate-flow-veo.mp4',
    poster: '/landing/studio/realestate-flow-veo-poster.jpg',
    sourceLabel: 'Geniş açı bahçe ve havuz çekimi',
    ctaText: 'Katalog ve Fiyat İste',
    headline: 'Özel Proje Lansmanı',
  },
  {
    id: 'clinic',
    tabLabel: 'Klinik & Sağlık',
    title: 'Özel Diş & Estetik Kliniği',
    brandName: 'Nova Dental Clinic',
    logo: '/landing/studio/sources/clinic_logo.svg',
    source: '/landing/studio/sources/clinic_product.jpg',
    video: '/landing/studio/clinic-flow-veo.mp4',
    poster: '/landing/studio/clinic-flow-veo-poster.jpg',
    sourceLabel: 'Klinik tedavi odasında doğal çekim',
    ctaText: 'Randevu Oluştur',
    headline: 'Gülüş Tasarımı & Kontrol',
  },
  {
    id: 'barber',
    tabLabel: 'Kuaför & Bakım',
    title: 'VIP Erkek Kuaförü & Saç Tasarım',
    brandName: 'Atelier Coiffeur',
    logo: '/landing/studio/sources/service_logo.svg',
    source: '/landing/studio/sources/service_product.jpg',
    video: '/landing/studio/service-flow-veo.mp4',
    poster: '/landing/studio/service-flow-veo-poster.jpg',
    sourceLabel: 'Salonda doğal ışıkta saç kesim karesi',
    ctaText: 'Saat Seç ve Randevu Al',
    headline: 'Kişiye Özel VIP Bakım',
  },
]

const ROTATION_INTERVAL_MS = 4500

export function CleanCreativeStudio() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progressKey, setProgressKey] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const current = CREATIVE_ITEMS[activeIndex]

  // Otomatik sektör rotasyonu
  useEffect(() => {
    if (isPaused) return

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CREATIVE_ITEMS.length)
      setProgressKey((k) => k + 1)
    }, ROTATION_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [isPaused, activeIndex])

  // Video değişiminde oynatmayı garantile
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [activeIndex])

  const handleSelect = (idx: number) => {
    setActiveIndex(idx)
    setProgressKey((k) => k + 1)
  }

  return (
    <div
      className="w-full max-w-[1240px] mx-auto space-y-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Sector Category Switcher Tabs with Auto-progress */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
        {CREATIVE_ITEMS.map((item, idx) => {
          const isActive = idx === activeIndex
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(idx)}
              className={`relative overflow-hidden px-4 sm:px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/25'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-xs'
              }`}
            >
              <span className="relative z-10">{item.tabLabel}</span>
              {isActive && !isPaused && (
                <span
                  key={progressKey}
                  className="absolute bottom-0 left-0 h-0.5 bg-emerald-300 transition-all"
                  style={{
                    animation: `ml-tab-progress ${ROTATION_INTERVAL_MS}ms linear forwards`,
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Main Clean Comparison Grid: Left (Ham Fotoğraf) -> Right (Dikey WhatsApp Reklamı) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xl shadow-slate-900/5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Sol Kolon: Ham Ürün Fotoğrafı */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                01 / Girdi
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Ham Telefon Fotoğrafı
              </span>
            </div>

            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-md">
              <Image
                key={current.source}
                src={current.source}
                alt={current.title}
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                className="object-cover transition-opacity duration-300"
                priority
              />
            </div>

            <div className="pt-1">
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                {current.title}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {current.sourceLabel}
              </p>
            </div>
          </div>

          {/* Orta Kolon: Mesajify Dönüşüm İkonu */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-4 lg:py-0 text-center">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center p-2 mb-3">
              <Image
                src="/brand/mesajify-studio-icon.png"
                alt="Mesajify AI Stüdyo"
                width={64}
                height={64}
                className="object-contain drop-shadow-md hover:scale-105 transition-transform"
              />
            </div>
            <span className="text-[11px] font-bold text-slate-800 tracking-wider uppercase">
              Mesajify Stüdyo
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 max-w-[140px] leading-tight">
              Logo, marka kiti ve mesajınız otomatik entegre edilir
            </span>
            <div className="mt-3 text-emerald-600 hidden lg:block">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Sağ Kolon: Oluşturulan Dikey Video Reklamı */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                02 / Çıktı
              </span>
              <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                9:16 Dikey WhatsApp Reklamı
              </span>
            </div>

            <div className="relative aspect-[9/16] w-full max-w-[340px] mx-auto rounded-2xl overflow-hidden border border-slate-900 bg-black shadow-2xl">
              {CREATIVE_ITEMS.map((item, idx) => {
                const isActive = idx === activeIndex
                return (
                  <video
                    key={item.id}
                    ref={(el) => {
                      if (isActive && el) {
                        videoRef.current = el
                      }
                    }}
                    src={item.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-in-out ${
                      isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  />
                )
              })}

              {/* Video Header Branding Overlay */}
              <div className="absolute top-0 left-0 right-0 z-10 p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                    <img
                      src={current.logo}
                      alt={current.brandName}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white leading-tight">
                      {current.brandName}
                    </span>
                    <span className="block text-[9px] text-emerald-300 font-medium">
                      WhatsApp Sponsorlu Tanıtım
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-white/80 bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  9:16 HD
                </span>
              </div>

              {/* Video Footer Action Line */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-white">
                    {current.headline}
                  </span>
                  <span className="block text-[10px] text-slate-300">
                    Mesajify ile hazırlandı
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#25d366] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                  <span>{current.ctaText}</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-600 pt-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Tek tıkla hedef kitleye WhatsApp üzerinden gönderilir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
