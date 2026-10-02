'use client'

import { useState } from 'react'
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
    sourceLabel: 'Mutfak / tezgâh üzerinde çekilmiş menü karesi',
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
    sourceLabel: 'Showroom zemininde doğal telefon çekimi',
    ctaText: 'Test Sürüşü Randevusu Al',
    headline: 'VIP Lansman & Test Sürüşü',
  },
]

export function CleanCreativeStudio() {
  const [activeIndex, setActiveIndex] = useState(0)
  const current = CREATIVE_ITEMS[activeIndex]

  return (
    <div className="w-full max-w-[1240px] mx-auto space-y-8">
      {/* Sector Category Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CREATIVE_ITEMS.map((item, idx) => {
          const isActive = idx === activeIndex
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-xs'
              }`}
            >
              {item.tabLabel}
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
                className="object-cover"
                priority
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <strong className="block text-sm font-bold text-slate-900">
                {current.title}
              </strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                {current.sourceLabel}
              </p>
            </div>
          </div>

          {/* Orta Kolon: Dönüşüm Köprüsü */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-4 text-center">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden shadow-lg shadow-emerald-900/10 mb-3 hover:scale-105 transition-transform duration-300">
              <Image
                src="/landing/infographics/mesajify-studio-icon.png"
                alt="Mesajify Stüdyo"
                fill
                sizes="80px"
                className="object-cover"
                priority
              />
            </div>
            <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">
              Mesajify Stüdyo
            </span>
            <span className="text-[11px] text-slate-500 mt-1 max-w-[140px] leading-tight">
              Logo, marka kiti ve mesajınız otomatik entegre edilir
            </span>
            <div className="hidden lg:flex mt-4 text-emerald-600">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>

          {/* Sağ Kolon: Yayına Hazır 9:16 WhatsApp Dikey Reklam Videosu */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                02 / Çıktı
              </span>
              <span className="text-xs text-emerald-700 font-semibold">
                9:16 Dikey WhatsApp Reklamı
              </span>
            </div>

            <div className="relative aspect-[9/16] w-full max-w-[340px] mx-auto rounded-2xl overflow-hidden border border-slate-900 bg-black shadow-2xl">
              <video
                key={current.video}
                src={current.video}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />

              {/* Video Header Overlay */}
              <div className="absolute top-0 left-0 right-0 z-10 p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-white p-0.5 flex items-center justify-center">
                    <img src={current.logo} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white leading-tight">
                      {current.brandName}
                    </span>
                    <span className="block text-[9px] text-emerald-300">
                      WhatsApp Sponsorlu Tanıtım
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-white/80 bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  9:16 HD
                </span>
              </div>

              {/* Video Footer Action Line */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-3.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white">
                  {current.headline}
                </span>
                <span className="text-[11px] font-bold text-[#25d366]">
                  {current.ctaText} →
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 pt-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Tek tıkla hedef kitleye WhatsApp üzerinden gönderilir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
