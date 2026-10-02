'use client'

import { useState, useRef, useEffect } from 'react'
import { MesajifyMark } from '../brand/mesajify-mark'
import { CheckCircle2, ArrowRight, ShieldCheck, MessageSquare, Compass, Send } from 'lucide-react'

interface HeroShowcase {
  id: string
  video: string
  poster: string
  categoryBadge: string
  headlineDynamic: string
  headlineLead: string
  sublead: string
  featureTitle: string
  featureTag: string
  ctaText: string
  icon: typeof Send
}

const HERO_SHOWCASES: HeroShowcase[] = [
  {
    id: 'campaign',
    video: '/landing/studio/mesajify-campaign-hologram.mp4',
    poster: '/landing/studio/mesajify-campaign-poster.jpg',
    categoryBadge: 'TEK TIKLA KAMPANYA',
    headlineLead: 'Müşteri kitlenize',
    headlineDynamic: 'tek tıkla kampanya oluşturup iletin',
    sublead: 'Fotoğrafınızı yükleyin, dikey tanıtım videonuz ve şablonunuz hazır olsun; binlerce alıcıya tek tıkla güvenle ulaştırın.',
    featureTitle: 'Kampanya & Video Stüdyosu',
    featureTag: 'Tek Tıkla Gönderim',
    ctaText: 'Kampanyayı Başlat',
    icon: Send,
  },
  {
    id: 'inbox',
    video: '/landing/studio/hero-flow-veo.mp4',
    poster: '/landing/studio/hero-flow-poster.jpg',
    categoryBadge: 'ORTAK GELEN KUTUSU',
    headlineLead: 'WhatsApp üzerinden',
    headlineDynamic: 'gelen müşteri taleplerini anında yanıtlayın',
    sublead: 'Kampanyanızdan dönen sipariş, fiyat ve randevu sorularını tek panelden ekipçe anında satışa dönüştürün.',
    featureTitle: 'Ortak Gelen Kutusu',
    featureTag: 'Canlı Müşteri Yanıtları',
    ctaText: 'Gelen Kutusu Demo',
    icon: MessageSquare,
  },
  {
    id: 'discovery',
    video: '/landing/studio/hero-isletme-bulucu-flow.mp4',
    poster: '/landing/studio/hero-isletme-bulucu-9-16.png',
    categoryBadge: 'İŞLETME BULUCU',
    headlineLead: 'Hedef pazarınızda',
    headlineDynamic: 'bölgenizdeki işletmeleri keşfedin',
    sublead: 'Şehir, ilçe ve sektör filtreleriyle doğrulanmış WhatsApp işletme numaralarını bulun, listenize tek tıkla ekleyin.',
    featureTitle: 'İşletme Bulucu & Harita',
    featureTag: '1.420 Doğrulanmış Firma',
    ctaText: 'Kitlenizi Keşfedin',
    icon: Compass,
  },
  {
    id: 'safe-delivery',
    video: '/landing/studio/pipeline-flow-veo.mp4',
    poster: '/landing/studio/pipeline-flow-poster.jpg',
    categoryBadge: 'GÜVENLİ VE AKILLI İLETİM',
    headlineLead: 'Spam riski olmadan',
    headlineDynamic: 'doğal hızda ve güvenle teslim edin',
    sublead: 'Akıllı bekleme aralıkları ve mola algoritmasıyla mesajlarınız insan hızında, kesintisiz iletilir.',
    featureTitle: 'Akıllı Dağıtım Hattı',
    featureTag: 'Yük Dengeleme Aktif',
    ctaText: 'Canlı İletimi Gör',
    icon: ShieldCheck,
  },
]

export function Scene01Hero() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const current = HERO_SHOWCASES[currentIndex]

  const handleVideoEnded = () => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SHOWCASES.length)
  }

  // Video değiştiğinde oynatmayı garanti et
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {
        // Tarayıcı autoplay politikası gereği sessiz fallback
      })
    }
  }, [currentIndex])

  return (
    <section className="ml-product-story ml-hero relative overflow-hidden">
      {/* Sol Taraf: Dinamik Dönen Başlıklar ve Değer Önerisi */}
      <div className="ml-hero-copy">
        <h1 className="text-slate-900">
          {current.headlineLead}<br />
          <span
            key={current.headlineDynamic}
            className="text-emerald-700 underline decoration-emerald-300 underline-offset-8 transition-all duration-500 inline-block"
          >
            {current.headlineDynamic}.
          </span>
          <br />
          <em>Müşteri kazanın.</em>
        </h1>

        <p className="ml-hero-lead font-semibold text-slate-800">
          {current.sublead}
        </p>

        <p className="ml-hero-description">
          Kendi müşteri listenizi kullanın veya işletme bulucu ile hedef kitlenizi oluşturun.
          Tanıtım mesajınızı paylaşın; fiyat, ürün ve sipariş sorularını tek panelden ekipçe yanıtlayın.
        </p>

        <div className="ml-hero-actions">
          <a href="https://app.mesajify.com/giris" className="flex items-center gap-2">
            <span>Hemen Başla</span>
            <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#nasil-calisir">Nasıl Çalışır ↓</a>
        </div>

        {/* Canlı Özellik & Müşteri Yetenekleri Döngü Seçicileri */}
        <div className="mt-8 pt-5 border-t border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2">
            {HERO_SHOWCASES.map((item, idx) => {
              const isActive = idx === currentIndex
              const IconComp = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/25'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <IconComp className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.categoryBadge}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="ml-hero-steps">
          <span>Kitle Belirleme</span>
          <span>Dikey Tanıtım Gönderimi</span>
          <span>Ortak Gelen Kutusu Satış</span>
        </div>
      </div>

      {/* Sağ Taraf: Çok Daha Geniş, Ambient Glow'lu Dikey Video Sahnesi */}
      <div className="ml-hero-visual relative flex items-center justify-center" aria-label="Mesajify dikey video platform vitrini">
        {/* Ambient Blurred Video Background Glow Layer */}
        <div className="absolute -inset-4 sm:-inset-6 -z-10 rounded-[36px] overflow-hidden filter blur-3xl opacity-35 scale-105 pointer-events-none transition-all duration-700">
          <video
            key={`ambient-${current.video}`}
            src={current.video}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        <div className="ml-hero-film w-full max-w-[460px] sm:max-w-[480px] lg:max-w-[500px] border border-slate-200/80 rounded-[28px] bg-white shadow-2xl overflow-hidden transition-all duration-300">
          <header className="flex items-center justify-between px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/70">
            <MesajifyMark variant="full" size="sm" decorative />
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
              {current.categoryBadge}
            </span>
          </header>

          <div className="ml-hero-film-content p-3 sm:p-4 bg-slate-950">
            <div className="ml-media relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
              <video
                ref={videoRef}
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
              <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-white p-0.5 flex items-center justify-center shadow-sm">
                    <MesajifyMark size="xs" decorative />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white leading-tight">
                      {current.featureTitle}
                    </span>
                    <span className="block text-[10px] text-emerald-300 font-medium">
                      Mesajify Platformu
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-200 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                  {current.featureTag}
                </span>
              </div>

              {/* Video Footer Action Line */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between">
                <div className="max-w-[60%]">
                  <span className="block text-xs font-bold text-white truncate">
                    {current.featureTitle}
                  </span>
                  <span className="block text-[10px] text-slate-300">
                    Doğrudan WhatsApp İletişimi
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#25d366] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg hover:brightness-105 transition-all">
                  <span>{current.ctaText}</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between px-5 py-3.5 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-600 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Gelen yanıtlar ortak gelen kutusunda anında toplanır</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {currentIndex + 1} / {HERO_SHOWCASES.length}
            </span>
          </footer>
        </div>
      </div>
    </section>
  )
}
