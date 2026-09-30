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
    <section className="scene relative min-h-screen flex flex-col justify-center pt-24 sm:pt-32 pb-16 sm:pb-24 lg:pt-36 lg:pb-32 overflow-hidden">
      {/* Background Soft Ambient Light */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-brand/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 w-full">
        {/* Top Copy Section */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 mb-6 sm:mb-8 animate-fade-in-up">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="text-xs font-medium text-emerald-800">
              WhatsApp Kampanya Platformu
            </span>
          </div>

          <h1
            className="text-[clamp(32px,5.5vw,76px)] leading-[1.08] font-[600] tracking-tight mb-4 sm:mb-6 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            Birden fazla WhatsApp.
            <br />
            Tek kampanya paneli.
          </h1>

          <p
            className="text-[clamp(20px,2.5vw,36px)] leading-[1.15] font-[500] tracking-tight text-ink-muted mb-6 sm:mb-8 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            Görselini üret. Hatlarına dağıt. Toplu ulaştır.
          </p>

          <p
            className="text-base sm:text-lg md:text-xl text-ink-muted max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            İşletme hatlarınızı QR kod ile bağlayın. Arayüzden kampanya görselinizi ve 9:16 videonuzu
            saniyeler içinde oluşturun; listenizi bağlı hatlar arasında akıllıca paylaştırarak toplu gönderin
            ve tüm müşteri yanıtlarını tek ortak gelen kutusunda yönetin.
          </p>

          {/* Action CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-fade-in-up"
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
            className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-hairline text-left animate-fade-in-up"
            style={{ animationDelay: '500ms' }}
          >
            <div className="p-3 rounded-xl bg-white/70 border border-hairline">
              <span className="text-xs font-semibold text-brand block">01 · İşletme Bulucu</span>
              <span className="text-xs text-ink-muted font-medium mt-0.5 block">Harita & Sektör Taraması</span>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-hairline">
              <span className="text-xs font-semibold text-brand block">02 · Video & Görsel</span>
              <span className="text-xs text-ink-muted font-medium mt-0.5 block">Panel İçi 9:16 Üretim</span>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-hairline">
              <span className="text-xs font-semibold text-brand block">03 · Akıllı Dağıtım</span>
              <span className="text-xs text-ink-muted font-medium mt-0.5 block">Dengeli Hat Rotasyonu</span>
            </div>
            <div className="p-3 rounded-xl bg-white/70 border border-hairline">
              <span className="text-xs font-semibold text-brand block">04 · Gelen Kutusu</span>
              <span className="text-xs text-ink-muted font-medium mt-0.5 block">Tüm Hatlar Tek Ekranda</span>
            </div>
          </div>
        </div>

        {/* SIGNATURE MOMENT 01: Interactive Dual Showcase Console */}
        <div id="hero-showcase" className="relative w-full max-w-[1140px] mx-auto animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          
          {/* Switcher Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3 px-1 sm:px-2">
            <div className="w-full sm:w-auto grid grid-cols-2 p-1 bg-surface rounded-xl border border-hairline shadow-xs max-w-xs sm:max-w-none mx-auto sm:mx-0">
              <button
                onClick={() => setViewMode('video')}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  viewMode === 'video'
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span>Panel Görünümü</span>
              </button>
              <button
                onClick={() => setViewMode('phone')}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  viewMode === 'phone'
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span>WhatsApp Görünümü</span>
              </button>
            </div>

            {viewMode === 'video' && (
              <button
                onClick={togglePlay}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-hairline bg-white text-xs font-medium text-ink-muted hover:text-ink transition-colors"
              >
                <span>{isPlaying ? 'Duraklat' : 'Oynat'}</span>
              </button>
            )}
          </div>

          {/* VIEW A: Desktop Dashboard Video Showcase */}
          {viewMode === 'video' && (
            <div className="relative rounded-2xl sm:rounded-3xl border border-hairline-strong bg-white shadow-2xl overflow-hidden group">
              {/* Browser Window Header */}
              <div className="h-10 sm:h-11 bg-surface border-b border-hairline flex items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400/80" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex items-center gap-2 px-3 py-0.5 rounded-md bg-white border border-hairline text-[11px] sm:text-xs font-[family-name:var(--font-jetbrains)] text-ink-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                  <span className="truncate max-w-[160px] sm:max-w-none">app.mesajify.com/kampanyalar</span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
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
              </div>

              {/* Bottom Console Status Bar */}
              <div className="bg-white p-3.5 sm:p-5 md:p-6 border-t border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-ink">
                    Kampanya Kontrol Merkezi
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-ink-muted font-medium">
                  <span>Otomatik Rotasyon</span>
                  <span>·</span>
                  <span>E.164 Temizleme</span>
                  <span>·</span>
                  <span className="text-brand font-semibold">Ortak Gelen Kutusu</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW B: Mobile Simulator Walkthrough */}
          {viewMode === 'phone' && (
            <div className="flex flex-col items-center justify-center py-4 sm:py-6">
              <div className="w-full max-w-[340px] sm:max-w-[380px]">
                <PhoneSimulator />
              </div>
              <p className="text-xs text-ink-muted mt-4 sm:mt-6 text-center max-w-sm px-4">
                Müşterinin telefonuna iletilen 9:16 dikey videoyu ve anlık gelen yanıtın panele düşüşünü gösterir.
              </p>
            </div>
          )}

        </div>
      </div>
    </section>
  )
}
