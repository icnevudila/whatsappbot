'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowRight, Monitor } from 'lucide-react'

interface HeroShowcase {
  id: string
  video: string
  poster: string
  categoryBadge: string
  headlineLead: string
  headlineDynamic: string
  sublead: string
  featureTitle: string
  featureTag: string
  ctaText: string
}

const HERO_SHOWCASES: HeroShowcase[] = [
  {
    id: 'ecosystem',
    video: '/landing/infographics/01-ana-urun-veo-i2v.mp4',
    poster: '/landing/infographics/01-ana-urun-veo-i2v-poster.webp',
    categoryBadge: 'KONTROL PANELİ',
    headlineLead: 'Tek merkezden',
    headlineDynamic: 'tüm WhatsApp ekosisteminizi canlı yönetin',
    sublead: 'Kreatif üretiminden hat dağıtımına, hedef kitle taramasından gelen kutusuna kadar tüm platform modülleri tam senkronize çalışır.',
    featureTitle: 'Mesajify Entegre Ekosistem Mimarisi',
    featureTag: '%99.4 Başarılı İletim',
    ctaText: 'Ekosistemi İncele',
  },
  {
    id: 'inbox',
    video: '/landing/infographics/04-ortak-inbox-veo-i2v.mp4',
    poster: '/landing/infographics/04-ortak-inbox-veo-i2v-poster.webp',
    categoryBadge: 'ORTAK GELEN KUTUSU',
    headlineLead: 'WhatsApp üzerinden',
    headlineDynamic: 'gelen müşteri ve sipariş taleplerini anında yanıtlayın',
    sublead: 'Kampanyanızdan dönen sipariş, toptan fiyat ve randevu sorularını tek panelden ekipçe anında satışa dönüştürün.',
    featureTitle: 'Ortak Gelen Kutusu & Hızlı Satış',
    featureTag: '18 Yeni Müşteri Yanıtı',
    ctaText: 'Gelen Kutusunu İncele',
  },
  {
    id: 'discovery',
    video: '/landing/infographics/06-isletme-bulucu-veo-i2v.mp4',
    poster: '/landing/infographics/06-isletme-bulucu-veo-i2v-poster.webp',
    categoryBadge: 'İŞLETME BULUCU',
    headlineLead: 'Hedef pazarınızda',
    headlineDynamic: 'bölgenizdeki işletmeleri haritadan keşfedin',
    sublead: 'Şehir, ilçe ve sektör filtreleriyle Kadıköy, Beşiktaş veya tüm Türkiye genelindeki doğrulanmış WhatsApp işletmelerini bulun, kitleye ekleyin.',
    featureTitle: 'İşletme Bulucu & Harita Radarı',
    featureTag: '1.420 Doğrulanmış Firma',
    ctaText: 'Kitlenizi Keşfedin',
  },
  {
    id: 'studio',
    video: '/landing/infographics/05-kreatif-studyosu-veo-i2v.mp4',
    poster: '/landing/infographics/05-kreatif-studyosu-veo-i2v-poster.webp',
    categoryBadge: 'KREATİF STÜDYOSU',
    headlineLead: 'Ürün fotoğrafınızdan',
    headlineDynamic: 'saniyeler içinde hazır dikey reklam üretin',
    sublead: 'Ham ürün görselinizi yükleyin; yapay zeka WhatsApp formatında profesyonel dikey tanıtım görseline ve videosuna dönüştürsün.',
    featureTitle: 'Ham Ürün → AI Reklam Dönüşümü',
    featureTag: 'Saniyeler İçinde Hazır',
    ctaText: 'Stüdyoyu Başlat',
  },
  {
    id: 'multiline',
    video: '/landing/infographics/03-coklu-hat-veo-i2v.mp4',
    poster: '/landing/infographics/03-coklu-hat-veo-i2v-poster.webp',
    categoryBadge: 'ÇOKLU HAT DAĞITICI',
    headlineLead: 'Yükü paylaştırın',
    headlineDynamic: 'bağlı hatlarınızla güvenli ve dengeli iletin',
    sublead: 'Tek bir hatta yük bindirmeden, akıllı dağıtıcıyla Hat 01, Hat 02 ve Hat 03 arasında eşit paylaştırarak kontrollü gönderim yapın.',
    featureTitle: 'Akıllı Dağıtıcı & Hat Yük Dengeleme',
    featureTag: '3 Hat Dengeli İletim',
    ctaText: 'Hatları İncele',
  },
]

export function Scene01Hero() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [prevIndex, setPrevIndex] = useState<number | null>(null)
  const [preloadNext, setPreloadNext] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const current = HERO_SHOWCASES[currentIndex]

  const handleVideoEnded = () => {
    setPrevIndex(currentIndex)
    setCurrentIndex((prev) => (prev + 1) % HERO_SHOWCASES.length)
  }

  // Clear previous video after 1000ms crossfade
  useEffect(() => {
    if (prevIndex !== null) {
      const timer = setTimeout(() => {
        setPrevIndex(null)
      }, 1050)
      return () => clearTimeout(timer)
    }
  }, [prevIndex])

  // Video değiştiğinde sıradaki videoyu başlat
  useEffect(() => {
    const activeVideo = videoRefs.current[currentIndex]
    if (activeVideo) {
      activeVideo.defaultMuted = true
      activeVideo.muted = true
      activeVideo.currentTime = 0
      const playPromise = activeVideo.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {})
      }
    }

    // Delay preloading the next video slightly to give the active video priority
    const preloadTimer = setTimeout(() => {
      setPreloadNext(true)
    }, 1500)
    return () => clearTimeout(preloadTimer)
  }, [currentIndex])

  return (
    <section className="relative w-full bg-white pt-36 sm:pt-40 lg:pt-44 pb-16 lg:pb-24 overflow-hidden border-b border-slate-100">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* 1. Üst Başlık Alanı: Mobilde 1. sırada, Masaüstünde Sol Kolonda */}
          <div className="order-1 lg:col-span-5 flex flex-col justify-center w-full">

            <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-bold text-slate-900 tracking-tight leading-[1.12]">
              {current.headlineLead}<br />
              <span
                key={current.headlineDynamic}
                className="text-emerald-700 underline decoration-emerald-300 underline-offset-8 transition-all duration-500 inline-block"
              >
                {current.headlineDynamic}.
              </span>
              <br />
              <span className="text-slate-800 font-medium italic">Müşteri kazanın.</span>
            </h1>
          </div>

          {/* 2. Video Oynatıcı: Mobilde 2. sırada (Başlığın hemen altında!), Masaüstünde Sağ Kolonda */}
          <div className="order-2 lg:col-span-7 lg:row-span-2 relative w-full flex items-center justify-center my-2 lg:my-0">
            {/* Ambient Blurred Video Background Glow Layer (Smooth Dissolve) */}
            <div className="absolute -inset-4 sm:-inset-8 -z-10 rounded-[40px] overflow-hidden filter blur-3xl opacity-30 scale-105 pointer-events-none transition-all duration-1000">
              {HERO_SHOWCASES.map((item, idx) => (
                <img
                  key={`ambient-${item.id}`}
                  src={item.poster}
                  alt=""
                  aria-hidden="true"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                    idx === currentIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
            </div>

            {/* Geniş SaaS Web/Dashboard Penceresi */}
            <div className="w-full max-w-[760px] xl:max-w-[820px] rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-950/10 overflow-hidden transition-all duration-300">
              {/* Browser Window Bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
                  <div className="ml-3 flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-md px-2.5 py-0.5 text-[11px] font-mono text-slate-500">
                    <Monitor className="h-3 w-3 text-slate-400" />
                    <span>app.mesajify.com</span>
                  </div>
                </div>
              </div>

              {/* 16:9 Geniş Uygulama Videosu (object-contain ile ASLA croplanmaz, 1000ms Cross-Fade) */}
              <div className="relative aspect-[16/9] w-full bg-[#050B08] overflow-hidden">
                {HERO_SHOWCASES.map((item, idx) => {
                  const isActive = idx === currentIndex
                  const isPrev = idx === prevIndex
                  const isNext = idx === (currentIndex + 1) % HERO_SHOWCASES.length
                  const shouldRenderVideo = isActive || isPrev || (isNext && preloadNext)

                  return (
                    <div
                      key={item.id}
                      className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                        isActive
                          ? 'opacity-100 z-10'
                          : isPrev
                            ? 'opacity-0 z-0 pointer-events-none'
                            : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    >
                      {/* High-fidelity poster placeholder */}
                      <img
                        src={item.poster}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        fetchPriority={idx === 0 ? 'high' : 'auto'}
                      />
                      {shouldRenderVideo && (
                        <video
                          ref={(el) => {
                            if (el) {
                              el.muted = true
                              el.defaultMuted = true
                              videoRefs.current[idx] = el
                            }
                          }}
                          src={item.video}
                          autoPlay={isActive}
                          muted
                          playsInline
                          preload={isActive ? 'auto' : 'metadata'}
                          onEnded={isActive ? handleVideoEnded : undefined}
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      )}
                    </div>
                  )
                })}

              </div>
            </div>
          </div>

          {/* 3. Açıklama ve Butonlar Alanı: Mobilde 3. sırada (Videonun hemen altında!), Masaüstünde Sol Kolonda */}
          <div className="order-3 lg:col-span-5 flex flex-col justify-center w-full">
            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed max-w-xl">
              {current.sublead}
            </p>

            <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl">
              Kendi müşteri listenizi kullanın veya işletme bulucu ile hedef kitlenizi oluşturun.
              Tanıtım mesajınızı paylaşın; fiyat, ürün ve sipariş sorularını tek panelden ekipçe yanıtlayın.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4">
              <a
                href="https://app.mesajify.com/giris"
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-700/20 transition-all text-sm sm:text-base"
              >
                <span>Hemen Başla</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#nasil-calisir"
                className="text-sm font-semibold text-slate-700 hover:text-emerald-700 px-4 py-3.5 transition-colors"
              >
                Nasıl Çalışır ↓
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
