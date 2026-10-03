'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, ArrowRight, MessageSquare, Compass, Send, Sparkles, ShieldCheck, Check, Laptop } from 'lucide-react'
import { MesajifyMark } from '../brand/mesajify-mark'

interface ChatBubble {
  sender: string
  time: string
  text: string
  type: 'incoming' | 'outgoing' | 'system'
  isOfficial?: boolean
}

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
  chatMessages: ChatBubble[]
}

const HERO_SHOWCASES: HeroShowcase[] = [
  {
    id: 'campaign',
    video: '/landing/studio/hero-lifestyle-customer.mp4',
    poster: '/landing/studio/hero-lifestyle-customer.jpg',
    categoryBadge: 'MÜŞTERİ BİLDİRİMİ',
    headlineLead: 'Tek tıkla',
    headlineDynamic: 'binlerce müşterinize doğrudan WhatsApp iletin',
    sublead: 'Müşterilerinizin cebine doğrudan düşen kişiselleştirilmiş kampanya ve indirim mesajlarıyla anında sipariş dönüşümü alın.',
    featureTitle: 'Kişiselleştirilmiş WhatsApp Kampanyası',
    featureTag: '%98.7 Açılma Oranı',
    ctaText: 'Kampanyayı Başlat',
    icon: Send,
    chatMessages: [
      {
        sender: 'Mesajify Kampanya',
        time: 'Şimdi',
        text: 'Merhaba Selin Hanım! 🌸 Bahar koleksiyonumuza özel sepette %20 indiriminiz tanımlandı. Kodunuz: BAHAR20',
        type: 'incoming',
        isOfficial: true,
      },
      {
        sender: 'Selin K.',
        time: '09:41',
        text: 'Harika, az önce incelediğim keten takımda geçerli mi? ✨',
        type: 'outgoing',
      },
      {
        sender: 'Mesajify Asistan',
        time: '09:42',
        text: 'Evet Selin Hanım! Kuponunuz uygulandı, bugün sipariş verirseniz aynı gün kargoda. 📦',
        type: 'incoming',
        isOfficial: true,
      },
    ],
  },
  {
    id: 'inbox',
    video: '/landing/studio/hero-lifestyle-business.mp4',
    poster: '/landing/studio/hero-lifestyle-business.jpg',
    categoryBadge: 'ORTAK GELEN KUTUSU',
    headlineLead: 'WhatsApp üzerinden',
    headlineDynamic: 'gelen müşteri ve sipariş taleplerini anında yanıtlayın',
    sublead: 'Kampanyanızdan dönen sipariş, toptan fiyat ve rezervasyon sorularını tek panelden ekipçe anında satışa dönüştürün.',
    featureTitle: 'Ortak Gelen Kutusu & Canlı Siparişler',
    featureTag: '12 Yeni Müşteri Yanıtı',
    ctaText: 'Gelen Kutusu Demo',
    icon: MessageSquare,
    chatMessages: [
      {
        sender: 'Mert A.',
        time: '11:15',
        text: 'Merhaba! Akşam 19:30 için 4 kişilik rezervasyon alabilir miyiz?',
        type: 'outgoing',
      },
      {
        sender: 'İşletme (Ortak Kutu)',
        time: '11:16',
        text: 'Merhaba Mert Bey! Masanız rezerve edildi, onay kodunuz: #MSJ-482 🎉',
        type: 'incoming',
        isOfficial: true,
      },
      {
        sender: 'Mert A.',
        time: '11:16',
        text: 'Süper hızlısınız, teşekkürler! 👍',
        type: 'outgoing',
      },
    ],
  },
  {
    id: 'discovery',
    video: '/landing/studio/hero-lifestyle-discovery.mp4',
    poster: '/landing/studio/hero-lifestyle-discovery.jpg',
    categoryBadge: 'İŞLETME BULUCU',
    headlineLead: 'Hedef pazarınızda',
    headlineDynamic: 'bölgenizdeki işletmeleri haritadan keşfedin',
    sublead: 'Şehir, ilçe ve sektör filtreleriyle Kadıköy, Beşiktaş veya tüm Türkiye genelindeki doğrulanmış WhatsApp işletmelerini bulun, kitleye ekleyin.',
    featureTitle: 'Harita Radarı & Doğrulanmış Firmalar',
    featureTag: '1.420 Doğrulanmış Firma',
    ctaText: 'Kitlenizi Keşfedin',
    icon: Compass,
    chatMessages: [
      {
        sender: 'Harita Radarı',
        time: 'Şimdi',
        text: 'Kadıköy & Beşiktaş: 284 doğrulanmış butik ve kafe listelendi 📍',
        type: 'system',
        isOfficial: true,
      },
      {
        sender: 'Mesajify B2B',
        time: '14:20',
        text: 'Seçili firmalara kişiselleştirilmiş tanıtım davetiyesi iletildi. İletim: %99.8 ✅',
        type: 'incoming',
        isOfficial: true,
      },
      {
        sender: 'Moda Butik',
        time: '14:25',
        text: 'Merhaba, B2B iş birliği kataloğunuzu incelemek isteriz. 📄',
        type: 'outgoing',
      },
    ],
  },
  {
    id: 'studio',
    video: '/landing/studio/hero-lifestyle-studio.mp4',
    poster: '/landing/studio/hero-lifestyle-studio.jpg',
    categoryBadge: 'KAMPANYA STÜDYOSU',
    headlineLead: 'Tüm ekibinizle',
    headlineDynamic: 'akıllı video ve katalog tanıtımları yönetin',
    sublead: 'Tanıtım videonuzu veya broşürünüzü ekleyin, dinamik isim değişkenli şablonunuzu belirleyin ve binlerce alıcıya tek tıkla güvenle ulaştırın.',
    featureTitle: 'Ekip Stüdyosu & Toplu Gönderim',
    featureTag: '3.850 Doğrulanmış Alıcı',
    ctaText: 'Kampanyayı Başlat',
    icon: Sparkles,
    chatMessages: [
      {
        sender: 'Mesajify Stüdyo',
        time: 'Şimdi',
        text: 'Yaz Koleksiyonu Tanıtımı: 3.850 alıcıya güvenli kuyrukla iletiliyor... 🚀',
        type: 'system',
        isOfficial: true,
      },
      {
        sender: 'Canlı Metrik',
        time: '16:05',
        text: 'İletim: %99.4 · Okunma: %92.1 · 84 Geri Dönüş 📈',
        type: 'incoming',
        isOfficial: true,
      },
      {
        sender: 'Toptan Alıcı',
        time: '16:10',
        text: 'Fiyat listenizi aldık, 100 adet sipariş için görüşebilir miyiz?',
        type: 'outgoing',
      },
    ],
  },
]

export function Scene01Hero() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const current = HERO_SHOWCASES[currentIndex]

  const handleVideoEnded = () => {
    if (!isPaused) {
      setCurrentIndex((prev) => (prev + 1) % HERO_SHOWCASES.length)
    }
  }

  // Otomatik rotasyon zamanlayıcısı (video bittiğinde veya 7.5 saniyede bir)
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_SHOWCASES.length)
    }, 7500)
    return () => clearInterval(timer)
  }, [isPaused, currentIndex])

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
            
            {/* Küçük Üst Rozet */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold w-fit mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Yeni Nesil WhatsApp Büyüme Platformu</span>
            </div>

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

            {/* Mesajify Deneyimi Butonları */}
            <div className="mt-8 pt-6 border-t border-slate-200/80">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Mesajify Müşteri & İşletme Deneyimi
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

            <div className="mt-6 flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Hedef Kitle
              </span>
              <span>→</span>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Tanıtım Gönderimi
              </span>
              <span>→</span>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Ortak Gelen Kutusu Satış
              </span>
            </div>
          </div>

          {/* Sağ Kolon: GENİŞ 16:9 Gerçek Müşteri & İşletme Videosu + Canlı WhatsApp Kartları (7 Kolon) */}
          <div
            className="lg:col-span-7 relative w-full flex items-center justify-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
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
                    <Laptop className="h-3 w-3 text-slate-400" />
                    <span>app.mesajify.com</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {current.categoryBadge}
                  </span>
                </div>
              </div>

              {/* 16:9 Geniş Sinematik Video + Floating WhatsApp Konuşma Katmanı */}
              <div className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden select-none">
                <video
                  ref={videoRef}
                  key={current.video}
                  src={current.video}
                  poster={current.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onEnded={handleVideoEnded}
                  className="w-full h-full object-cover"
                />

                {/* Hafif Koyu Gradyan Kaplama (Kartların Okunabilirliği İçin) */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Floating WhatsApp Chat Bubbles Overlay (Palmate Stili, Mesajify Markalı) */}
                <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between pointer-events-none">
                  
                  {/* Üst Floating Bildirim / Durum Rozeti */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-white/15 text-white shadow-xl animate-in fade-in duration-500">
                      <div className="h-5 w-5 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">
                        W
                      </div>
                      <span className="text-xs font-semibold tracking-wide">WhatsApp Kampanya Akışı</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>

                    <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-xs font-medium shadow-xl">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{current.featureTag}</span>
                    </div>
                  </div>

                  {/* Alt / Orta WhatsApp Mesaj Baloncukları */}
                  <div className="space-y-2.5 max-w-[92%] sm:max-w-[440px] mt-auto">
                    {current.chatMessages.map((msg, i) => {
                      const isOutgoing = msg.type === 'outgoing'
                      const isSystem = msg.type === 'system'

                      if (isSystem) {
                        return (
                          <div
                            key={i}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/90 backdrop-blur-md border border-emerald-400/40 text-emerald-100 text-[11px] sm:text-xs font-medium shadow-lg transition-all animate-in slide-in-from-bottom-2 duration-300"
                            style={{ animationDelay: `${i * 180}ms` }}
                          >
                            <span className="font-bold text-emerald-300">● {msg.sender}:</span>
                            <span>{msg.text}</span>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={i}
                          className={`flex items-end gap-2 transition-all animate-in slide-in-from-bottom-2 duration-400 ${
                            isOutgoing ? 'justify-end' : 'justify-start'
                          }`}
                          style={{ animationDelay: `${i * 220}ms` }}
                        >
                          <div
                            className={`relative px-3.5 py-2.5 rounded-2xl shadow-xl backdrop-blur-md text-xs sm:text-[13px] leading-relaxed max-w-[85%] sm:max-w-[340px] ${
                              isOutgoing
                                ? 'bg-[#E7FFDB]/95 text-slate-900 rounded-br-xs border border-emerald-500/20'
                                : 'bg-white/95 text-slate-900 rounded-bl-xs border border-white/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <span
                                className={`text-[10px] font-bold tracking-wide uppercase ${
                                  msg.isOfficial ? 'text-emerald-700' : 'text-slate-500'
                                }`}
                              >
                                {msg.sender}
                              </span>
                              <span className="text-[9px] text-slate-400">{msg.time}</span>
                            </div>

                            <p className="font-medium text-slate-800">{msg.text}</p>

                            {isOutgoing && (
                              <div className="flex justify-end mt-1">
                                <span className="text-[10px] text-emerald-600 font-bold tracking-tighter">✓✓</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                </div>

                {/* Floating Bottom Info Bar */}
                <div className="absolute bottom-3 left-4 right-4 z-10 hidden sm:flex items-center justify-between pointer-events-none">
                  <div className="bg-slate-950/85 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg flex items-center gap-2 shadow-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-semibold text-white/90">
                      {current.featureTitle}
                    </span>
                  </div>
                  <div className="bg-[#25D366] text-white text-[11px] font-bold px-3 py-1 rounded-lg shadow-lg flex items-center gap-1">
                    <span>{current.ctaText}</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Pencere Alt Bilgi Çubuğu ve İlerleme Göstergesi */}
              <div className="flex items-center justify-between px-5 py-3 bg-white border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium">Doğrudan WhatsApp İletişimi · Yüksek Dönüşüm</span>
                </div>
                
                {/* 4 Noktalı Slide Göstergesi */}
                <div className="flex items-center gap-1.5">
                  {HERO_SHOWCASES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === currentIndex ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}
