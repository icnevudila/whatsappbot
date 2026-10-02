'use client'

import { useState, useEffect } from 'react'
import { MesajifyMark } from '../brand/mesajify-mark'
import { CheckCircle2, Play } from 'lucide-react'

interface HeroShowcase {
  video: string
  poster: string
  sectorBadge: string
  headlineDynamic: string
  sublead: string
  businessName: string
  ctaText: string
}

const HERO_SHOWCASES: HeroShowcase[] = [
  {
    video: '/landing/studio/ecommerce-flow-veo.mp4',
    poster: '/landing/studio/sources/nike_sneaker_raw.jpg',
    sectorBadge: 'SPOR GİYİM & E-TİCARET',
    headlineDynamic: 'yeni sezon koleksiyonunuzu',
    sublead: 'Yeni ürün lansmanınızı ve dikey katalog videonuzu WhatsApp’tan binlerce alıcıya tek tıkla duyurun.',
    businessName: 'Nike Sportswear',
    ctaText: 'WhatsApp ile İncele',
  },
  {
    video: '/landing/studio/restaurant-flow-veo.mp4',
    poster: '/landing/studio/sources/burger_raw.jpg',
    sectorBadge: 'RESTORAN & GURME LEZZETLER',
    headlineDynamic: 'özel gurme menünüzü',
    sublead: 'Günün menüsünü, lezzetli paket servis fırsatlarını civarınızdaki potansiyel müşterilere ulaştırın.',
    businessName: 'Burger Lab Artisan',
    ctaText: 'WhatsApp ile Sipariş Ver',
  },
  {
    video: '/landing/studio/automotive-flow-veo.mp4',
    poster: '/landing/studio/sources/car_raw.jpg',
    sectorBadge: 'OTOMOTİV & VIP GALERİ',
    headlineDynamic: 'araç ve filo portföyünüzü',
    sublead: 'Yeni model araçlarınızı, test sürüşü ve özel finansman tekliflerinizi doğrudan ilgilenen alıcılara iletin.',
    businessName: 'Veloce Motors',
    ctaText: 'Test Sürüşü Randevusu Al',
  },
  {
    video: '/landing/studio/realestate-flow-veo.mp4',
    poster: '/landing/studio/sources/realestate_product.jpg',
    sectorBadge: 'GAYRİMENKUL & PROJE SATIŞ',
    headlineDynamic: 'prestijli konut projelerinizi',
    sublead: 'Bölgenizdeki yatırımcılara yeni gayrimenkul projelerinizi ve kat planı videolarını doğrudan ulaştırın.',
    businessName: 'Apex Real Estate',
    ctaText: 'Katalog ve Fiyat Talep Et',
  },
]

export function Scene01Hero() {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Otomatik video geçişi (video bitince onEnded veya fallback)
  const current = HERO_SHOWCASES[currentIndex]

  const handleVideoEnded = () => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SHOWCASES.length)
  }

  return (
    <section className="ml-product-story ml-hero">
      {/* Sol Taraf: Dinamik Dönen Başlıklar ve Değer Önerisi */}
      <div className="ml-hero-copy">
        <h1 className="text-slate-900">
          Civarınızdaki işletmelere<br />
          <span
            key={current.headlineDynamic}
            className="text-emerald-700 underline decoration-emerald-300 underline-offset-8 transition-all duration-500 inline-block"
          >
            {current.headlineDynamic}
          </span>
          <br />
          tanıtın. <em>Müşteri kazanın.</em>
        </h1>

        <p className="ml-hero-lead font-semibold text-slate-800">
          {current.sublead}
        </p>

        <p className="ml-hero-description">
          Kendi müşteri listenizi kullanın veya hedeflediğiniz bölge ve sektör için kitle talep edin.
          Tanıtım mesajınızı paylaşın; fiyat, ürün ve sipariş sorularını tek panelden yanıtlayın.
        </p>

        <div className="ml-hero-actions">
          <a href="https://app.mesajify.com/giris">Hemen Başla →</a>
          <a href="#nasil-calisir">Nasıl Çalışır ↓</a>
        </div>

        {/* Canlı Sektör Döngü Seçicileri */}
        <div className="mt-8 pt-5 border-t border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2">
            {HERO_SHOWCASES.map((item, idx) => {
              const isActive = idx === currentIndex
              return (
                <button
                  key={item.sectorBadge}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {item.sectorBadge.split(' & ')[0]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="ml-hero-steps">
          <span>Hedef kitle</span>
          <span>Doğrudan WhatsApp Reklamı</span>
          <span>Müşteri yanıtları</span>
        </div>
      </div>

      {/* Sağ Taraf: Geniş, Temiz Dikey Video Oynatıcı */}
      <div className="ml-hero-visual" aria-label="Mesajify dikey video reklam vitrini">
        <div className="ml-hero-film">
          <header className="flex items-center justify-between">
            <MesajifyMark variant="full" size="sm" decorative />
            <span className="text-xs font-medium text-slate-500">
              {current.sectorBadge}
            </span>
          </header>

          <div className="ml-hero-film-content">
            <div className="ml-media relative w-full aspect-[9/16] max-w-[380px] mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black">
              <video
                key={current.video}
                src={current.video}
                poster={current.poster}
                autoPlay
                muted
                playsInline
                preload="metadata"
                onEnded={handleVideoEnded}
                className="w-full h-full object-cover"
              />

              {/* Video Header Branding Overlay */}
              <div className="absolute top-0 left-0 right-0 z-10 p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-white p-0.5 flex items-center justify-center">
                    <MesajifyMark size="xs" decorative />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white leading-tight">
                      {current.businessName}
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
                    {current.headlineDynamic.toUpperCase()}
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
          </div>

          <footer className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Gelen yanıtlar ortak panelde anında toplanır</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {currentIndex + 1} / {HERO_SHOWCASES.length}
            </span>
          </footer>
        </div>
      </div>
    </section>
  )
}
