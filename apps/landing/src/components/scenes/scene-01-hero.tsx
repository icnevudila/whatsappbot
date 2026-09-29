'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { PhoneSimulator } from '../hero/phone-simulator'

export function Scene01Hero() {
  const [viewMode, setViewMode] = useState<'video' | 'phone'>('video')
  const [isPlaying, setIsPlaying] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  return (
    <section className="scene relative min-h-screen flex flex-col justify-center pt-32 pb-24 lg:pt-36 lg:pb-32 overflow-hidden">
      {/* Background Soft Ambient Light */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-brand/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-6 w-full">
        {/* Top Copy Section */}
        <div className="text-center max-w-4xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span className="font-[family-name:var(--font-jetbrains)] text-[11px] font-semibold tracking-[0.12em] uppercase text-brand">
              ÇOKLU WHATSAPP HAT YÖNETİMİ & AI KAMPANYA PLATFORMU
            </span>
          </div>

          <h1
            className="text-[clamp(44px,6vw,84px)] leading-[1.04] font-[600] tracking-tight mb-6 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            Birden fazla WhatsApp.
            <br />
            Tek kampanya paneli.
          </h1>

          <p
            className="text-[clamp(24px,3vw,40px)] leading-[1.15] font-[500] tracking-tight text-ink-muted mb-8 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            Görselini üret. Hatlarına dağıt. Toplu ulaştır.
          </p>

          <p
            className="text-lg md:text-xl text-ink-muted max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            İşletme hatlarınızı QR kod ile bağlayın. Arayüzden kampanya görselinizi ve 9:16 videonuzu
            saniyeler içinde oluşturun; listenizi bağlı hatlar arasında akıllıca paylaştırarak toplu gönderin
            ve tüm müşteri yanıtlarını tek ortak gelen kutusunda yönetin.
          </p>

          {/* Action CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: '400ms' }}
          >
            <a
              href="https://app.mesajify.com/giris"
              className="w-full sm:w-auto text-base font-semibold bg-brand text-white px-8 py-4 rounded-[12px] hover:bg-brand-hover transition-all duration-200 shadow-lg shadow-brand/20 text-center"
            >
              İlk Kampanyanı Oluştur →
            </a>
            <button
              onClick={() => {
                setViewMode('video')
                const el = document.getElementById('hero-showcase')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="w-full sm:w-auto text-base font-medium text-ink-muted hover:text-ink transition-colors px-6 py-4 flex items-center justify-center gap-2 border border-hairline rounded-[12px] bg-white shadow-xs"
            >
              <span className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center">
                <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 16 16">
                  <path d="M4 2.5v11l9-5.5-9-5.5z" />
                </svg>
              </span>
              Paneli Canlı İzle
            </button>
          </div>

          {/* 4 Architecture Pillars */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 pt-8 border-t border-hairline text-left animate-fade-in-up"
            style={{ animationDelay: '500ms' }}
          >
            <div className="p-3 rounded-xl bg-white/70 border border-hairline">
              <span className="text-xs font-[family-name:var(--font-jetbrains)] text-brand font-semibold block">01 · QR Bağlantı</span>
              <span className="text-xs text-ink-muted font-medium mt-0.5 block">Çoklu WhatsApp Havuzu</span>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-hairline">
              <span className="text-xs font-[family-name:var(--font-jetbrains)] text-brand font-semibold block">02 · AI Stüdyo</span>
              <span className="text-xs text-ink-muted font-medium mt-0.5 block">Panel İçi 9:16 Video</span>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-hairline">
              <span className="text-xs font-[family-name:var(--font-jetbrains)] text-brand font-semibold block">03 · Akıllı Dağıtım</span>
              <span className="text-xs text-ink-muted font-medium mt-0.5 block">Dengeli Hat Rotasyonu</span>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-hairline">
              <span className="text-xs font-[family-name:var(--font-jetbrains)] text-brand font-semibold block">04 · Ortak Kutu</span>
              <span className="text-xs text-ink-muted font-medium mt-0.5 block">Tek Ekranda Yanıtlar</span>
            </div>
          </div>
        </div>

        {/* SIGNATURE MOMENT 01: Interactive Dual Showcase Console */}
        <div id="hero-showcase" className="relative w-full max-w-[1140px] mx-auto animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          
          {/* Switcher Navigation */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="inline-flex p-1 bg-surface rounded-2xl border border-hairline shadow-xs">
              <button
                onClick={() => setViewMode('video')}
                className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'video'
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <span>🖥️</span>
                <span>Mesajify Panel Walkthrough (Video Demo)</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-brand text-white font-mono">CANLI</span>
              </button>
              <button
                onClick={() => setViewMode('phone')}
                className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'phone'
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <span>📱</span>
                <span>Müşteri WhatsApp Deneyimi (Mobil Simülatör)</span>
              </button>
            </div>

            {viewMode === 'video' && (
              <button
                onClick={togglePlay}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-hairline bg-white text-xs font-medium text-ink-muted hover:text-ink transition-colors"
              >
                <span>{isPlaying ? '⏸ Duraklat' : '▶ Oynat'}</span>
              </button>
            )}
          </div>

          {/* VIEW A: Desktop Dashboard Video Showcase */}
          {viewMode === 'video' && (
            <div className="relative rounded-3xl border border-hairline-strong bg-white shadow-2xl overflow-hidden group">
              {/* Browser Window Header */}
              <div className="h-11 bg-surface border-b border-hairline flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-hairline text-xs font-[family-name:var(--font-jetbrains)] text-ink-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  app.mesajify.com/kampanyalar
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-[family-name:var(--font-jetbrains)] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Sistem Aktif
                  </span>
                </div>
              </div>

              {/* Video Viewport with Interactive Overlays */}
              <div className="relative w-full aspect-[16/9] md:aspect-[1280/626] bg-[#07100C] overflow-hidden">
                <video
                  ref={videoRef}
                  src="/landing/demo.mp4"
                  poster="/landing/demo-poster.png"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover object-top"
                />

                {/* Live Floating HTML Badge 1: Connected WhatsApp Lines */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 shadow-xl text-white">
                  <div className="relative flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping absolute" />
                    <span className="w-2 h-2 rounded-full bg-brand relative" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold leading-tight">3 Hat Bağlı & Dengeli</div>
                    <div className="text-[10px] text-white/60 font-[family-name:var(--font-jetbrains)]">Hat 1 · Hat 2 · Hat 3</div>
                  </div>
                </div>

                {/* Live Floating HTML Badge 2: Delivery Engine Rate */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 shadow-xl text-white">
                  <div className="w-7 h-7 rounded-lg bg-brand/20 text-brand flex items-center justify-center font-bold text-xs font-[family-name:var(--font-jetbrains)]">
                    ⚡
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold leading-tight">2.291 Gönderim</div>
                    <div className="text-[10px] text-emerald-400 font-[family-name:var(--font-jetbrains)]">%99.4 Teslimat</div>
                  </div>
                </div>

                {/* Live Floating HTML Badge 3: AI Creative Ready */}
                <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 shadow-xl text-white">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                    🎨
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold leading-tight">AI Kreatif Stüdyosu</div>
                    <div className="text-[10px] text-white/60 font-[family-name:var(--font-jetbrains)]">9:16 Video & Ses Hazır</div>
                  </div>
                </div>

                {/* Live Floating HTML Badge 4: Unified Inbox Response */}
                <div className="absolute bottom-4 right-4 z-20 hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 shadow-xl text-white">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                    💬
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold leading-tight">Ortak Gelen Kutusu</div>
                    <div className="text-[10px] text-white/60 font-[family-name:var(--font-jetbrains)]">324 Müşteri Yanıtı Canlı</div>
                  </div>
                </div>

                {/* Mesajify Watermark in corner */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-300">
                  <Image src="/logos/mesajify-logo.png" width={200} height={40} alt="Mesajify" className="brightness-200" />
                </div>
              </div>

              {/* Bottom Console Status Bar */}
              <div className="bg-white p-4 md:p-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold text-ink">
                    Mesajify Gerçek Uygulama Arayüzü Walkthrough
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-[family-name:var(--font-jetbrains)] text-ink-muted">
                  <span>Otomatik Rotasyon</span>
                  <span>·</span>
                  <span>E.164 Temizleme</span>
                  <span>·</span>
                  <span className="text-brand font-medium">Tek Ortak Inbox</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW B: Mobile Simulator Walkthrough */}
          {viewMode === 'phone' && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-full max-w-[380px]">
                <PhoneSimulator />
              </div>
              <p className="text-xs text-ink-muted font-[family-name:var(--font-jetbrains)] mt-6 text-center">
                Müşterinin cep telefonunda 9:16 videoyu nasıl gördüğünü ve gelen yanıtın Mesajify paneline nasıl aktarıldığını simüle eder.
              </p>
            </div>
          )}

        </div>
      </div>
    </section>
  )
}
