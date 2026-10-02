'use client'

import { useState, useRef, useEffect } from 'react'
import { MesajifyMark } from '../brand/mesajify-mark'
import { CheckCircle2, ArrowRight, MessageSquare, Compass, Send, ShieldCheck, Monitor } from 'lucide-react'

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
  icon: typeof Send
}

const HERO_SHOWCASES: HeroShowcase[] = [
  {
    id: 'inbox',
    video: '/landing/infographics/04-ortak-inbox-veo-i2v.mp4',
    poster: '/landing/studio/hero-wide-inbox.jpg',
    categoryBadge: 'ORTAK GELEN KUTUSU',
    headlineLead: 'WhatsApp üzerinden',
    headlineDynamic: 'gelen müşteri taleplerini anında yanıtlayın',
    sublead: 'Kampanyanızdan dönen sipariş, fiyat ve randevu sorularını tek panelden ekipçe anında satışa dönüştürün.',
    featureTitle: 'Ortak Gelen Kutusu & Satış Yönetimi',
    featureTag: 'Canlı Müşteri Yanıtları',
    ctaText: 'Gelen Kutusu Demo',
    icon: MessageSquare,
  },
  {
    id: 'campaign',
    video: '/landing/studio/hero-kampanya-hazirlik-16-9.mp4',
    poster: '/landing/studio/hero-wide-kampanya.jpg',
    categoryBadge: 'KAMPANYA STÜDYOSU',
    headlineLead: 'Müşteri kitlenize',
    headlineDynamic: 'tek tıkla kampanya oluşturup iletin',
    sublead: 'Fotoğrafınızı yükleyin, dikey tanıtım videonuz ve şablonunuz hazır olsun; binlerce alıcıya tek tıkla güvenle ulaştırın.',
    featureTitle: 'Kampanya ve Mesaj Hazırlığı',
    featureTag: 'Tek Tıkla Gönderim',
    ctaText: 'Kampanyayı Başlat',
    icon: Send,
  },
  {
    id: 'discovery',
    video: '/landing/infographics/06-isletme-bulucu-veo-i2v.mp4',
    poster: '/landing/studio/hero-wide-bulucu.jpg',
    categoryBadge: 'İŞLETME BULUCU',
    headlineLead: 'Hedef pazarınızda',
    headlineDynamic: 'bölgenizdeki işletmeleri haritadan keşfedin',
    sublead: 'Şehir, ilçe ve sektör filtreleriyle doğrulanmış WhatsApp işletme numaralarını bulun, listenize tek tıkla ekleyin.',
    featureTitle: 'İşletme Bulucu & Harita Keşfi',
    featureTag: '1.420 Doğrulanmış Firma',
    ctaText: 'Kitlenizi Keşfedin',
    icon: Compass,
  },
  {
    id: 'command-center',
    video: '/landing/studio/mesajify-hero-loop-seamless.mp4',
    poster: '/landing/studio/hero-wide-mesajify-seamless.jpg',
    categoryBadge: 'KONTROL MERKEZİ',
    headlineLead: 'Doğal hızda',
    headlineDynamic: 'kesintisiz güvenli iletim sağlayın',
    sublead: 'Akıllı bekleme aralıkları, yük dengeleme ve güvenli altyapı ile tanıtımlarınız kesintisiz olarak iletilir.',
    featureTitle: 'Mesajify Canlı İletim Hattı',
    featureTag: 'Yük Dengeleme Aktif',
    ctaText: 'Canlı Paneli Gör',
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

  // Video değiştiğinde sıfırlayıp oynat
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }, [currentIndex])

  return (
    <section className="relative w-full bg-white pt-36 sm:pt-40 lg:pt-44 pb-16 lg:pb-24 overflow-hidden border-b border-slate-100">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Sol Kolon: Başlık, Açıklama ve Hızlı Başla (5 Kolon) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
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

            <p className="mt-6 text-base sm:text-lg text-slate-700 font-medium leading-relaxed max-w-xl">
              {current.sublead}
            </p>

            <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl">
              Kendi müşteri listenizi kullanın veya işletme bulucu ile hedef kitlenizi oluşturun.
              Tanıtım mesajınızı paylaşın; fiyat, ürün ve sipariş sorularını tek panelden ekipçe yanıtlayın.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
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

            {/* Mesajify Uygulama Yetenekleri Butonları */}
            <div className="mt-8 pt-6 border-t border-slate-200/80">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Mesajify Uygulama Ekranları
              </span>
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

            <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
              <span>Hedef Kitle</span>
              <span>→</span>
              <span>Tanıtım Gönderimi</span>
              <span>→</span>
              <span>Ortak Gelen Kutusu Satış</span>
            </div>
          </div>

          {/* Sağ Kolon: BAYA GENİŞ 16:9 Mesajify Uygulama Ekranı (7 Kolon) */}
          <div className="lg:col-span-7 relative w-full flex items-center justify-center">
            {/* Ambient Blurred Video Background Glow Layer */}
            <div className="absolute -inset-4 sm:-inset-8 -z-10 rounded-[40px] overflow-hidden filter blur-3xl opacity-35 scale-105 pointer-events-none transition-all duration-700">
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

            {/* Geniş SaaS Web/Dashboard Penceresi */}
            <div className="w-full max-w-[760px] xl:max-w-[820px] rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-950/10 overflow-hidden transition-all duration-300">
              {/* Browser Window Bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
                  <div className="ml-3 hidden sm:flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-md px-2.5 py-0.5 text-[11px] font-mono text-slate-500">
                    <Monitor className="h-3 w-3 text-slate-400" />
                    <span>app.mesajify.com</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                    {current.categoryBadge}
                  </span>
                </div>
              </div>

              {/* 16:9 Geniş Uygulama Videosu Oynatıcısı */}
              <div className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden">
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

                {/* Floating Bottom Info Pill */}
                <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                  <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-white">
                      {current.featureTitle}
                    </span>
                  </div>
                  <div className="bg-[#25d366] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
                    <span>{current.ctaText}</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Pencere Alt Bilgi Çubuğu */}
              <div className="flex items-center justify-between px-5 py-3 bg-white border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Doğrudan WhatsApp İletişimi · Sıfır Spam Riski</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 font-semibold">
                  {currentIndex + 1} / {HERO_SHOWCASES.length}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}
