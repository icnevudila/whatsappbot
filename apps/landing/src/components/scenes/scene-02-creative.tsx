'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

export function Scene02CreativeStudio() {
  const [studioMode, setStudioMode] = useState<'showcase' | 'process'>('showcase')
  const headRef = useReveal<HTMLDivElement>()
  const videosRef = useReveal<HTMLDivElement>(0.1)
  const statsRef = useReveal<HTMLDivElement>(0.2)

  return (
    <section className="scene bg-dark text-white">
      {/* Part A — Headline with generous space */}
      <div className="scene-pad-lg">
        <div ref={headRef} className="reveal max-w-[1240px] mx-auto px-6">
          <p className="font-[family-name:var(--font-jetbrains)] text-[11px] font-medium tracking-[0.12em] uppercase text-brand mb-8 font-semibold">
            PANEL İÇİ YAPAY ZEKA KREATİF MOTORU
          </p>
          <h2 className="text-[clamp(40px,5.5vw,80px)] leading-[1.04] font-[600] tracking-tight max-w-3xl">
            Arayüzden ayrılmadan.
            <br />
            Reklam görseli ve videosu.
          </h2>
          <p className="text-xl text-white/60 mt-8 max-w-xl leading-relaxed">
            Ajansa veya karmaşık video editörlerine gerek yok. Ürün fotoğrafınızı yükleyin; Mesajify panel içinde reklam görselinizi, 9:16 dikey tanıtım videonuzu ve Türkçe seslendirmesini toplu WhatsApp gönderimine hazır hale getirsin.
          </p>

        </div>
      </div>

      {/* Part B — Cinematic video showcase and Interactive Process Switcher */}
      <div ref={videosRef} className="reveal max-w-[1400px] mx-auto px-6 pb-24">
        
        {/* Mode Switcher Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => setStudioMode('showcase')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                studioMode === 'showcase' ? 'bg-brand text-white shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              Video Vitrini
            </button>
            <button
              onClick={() => setStudioMode('process')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                studioMode === 'process' ? 'bg-brand text-white shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              Fotoğraftan Kampanyaya
            </button>
          </div>
        </div>

        {studioMode === 'showcase' ? (
          <div className="flex flex-col md:flex-row items-end justify-center gap-6 animate-fade-in">
            {/* Left — Restaurant / Bakery */}
            <div className="w-full md:w-[260px] aspect-[9/16] rounded-2xl overflow-hidden bg-dark-surface border border-white/10 shrink-0 opacity-85 hover:opacity-100 transition-opacity duration-300 relative group">
              <video
                autoPlay
                muted
                loop
                playsInline
                poster="/landing/studio/bakery-croissant-ad.png"
                className="w-full h-full object-cover"
              >
                <source src="/landing/studio/restaurant-flow-veo.mp4" type="video/mp4" />
              </video>
            </div>

            {/* Center — Product / Brand Hero */}
            <div className="w-full md:w-[320px] aspect-[9/16] rounded-3xl overflow-hidden bg-dark-surface border border-white/15 shadow-2xl shrink-0 relative z-10 group">
              <video
                autoPlay
                muted
                loop
                playsInline
                poster="/landing/studio/hero-flow-veo-poster.jpg"
                className="w-full h-full object-cover"
              >
                <source src="/landing/studio/hero-flow-veo.mp4" type="video/mp4" />
              </video>
            </div>

            {/* Right — Tech / E-commerce Headphones */}
            <div className="w-full md:w-[260px] aspect-[9/16] rounded-2xl overflow-hidden bg-dark-surface border border-white/10 shrink-0 opacity-85 hover:opacity-100 transition-opacity duration-300 relative group">
              <video
                autoPlay
                muted
                loop
                playsInline
                poster="/landing/studio/nova-headphones-ad.png"
                className="w-full h-full object-cover"
              >
                <source src="/landing/studio/ecommerce-flow-veo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        ) : (
          /* Process Pipeline View: Raw Input -> AI Ad -> 9:16 Video -> WhatsApp Delivery */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in max-w-6xl mx-auto">
            {/* Step 1: Raw Input Photo */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between group">
              <div className="mb-3">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-white/70">
                  01 · Girdi Fotoğrafı
                </span>
                <h4 className="text-sm font-semibold text-white mt-2">Telefonla Çekilmiş Ürün</h4>
                <p className="text-xs text-white/50 mt-1">Stüdyo ışığı veya profesyonel çekim gerekmez.</p>
              </div>
              <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black/40 border border-white/10">
                <Image
                  src="/landing/studio/hero-source-product.png"
                  alt="Ham Ürün Fotoğrafı"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Step 2: AI Generated Ad Visual */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between group">
              <div className="mb-3">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-brand/20 text-brand font-medium">
                  02 · AI Reklam Görseli
                </span>
                <h4 className="text-sm font-semibold text-white mt-2">DALL-E Reklam Tasarımı</h4>
                <p className="text-xs text-white/50 mt-1">Lüks ışıklandırma, marka rengi ve tipografi.</p>
              </div>
              <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black/40 border border-white/10">
                <Image
                  src="/landing/studio/nova-headphones-ad.png"
                  alt="AI Üretimi Reklam Görseli"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Step 3: Veo 3.1 9:16 Video */}
            <div className="rounded-2xl border border-brand/40 bg-brand/5 p-4 flex flex-col justify-between group shadow-lg shadow-brand/10">
              <div className="mb-3">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-brand text-white font-medium">
                  03 · 9:16 Veo 3.1 Video
                </span>
                <h4 className="text-sm font-semibold text-white mt-2">8 Saniye Dikey Film</h4>
                <p className="text-xs text-white/50 mt-1">Kamera hareketi, Türkçe ses ve altyazı.</p>
              </div>
              <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black border border-white/10">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/landing/studio/nova-headphones-ad.png"
                  className="w-full h-full object-cover"
                >
                  <source src="/landing/studio/ecommerce-flow-veo.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

            {/* Step 4: WhatsApp Message & Instant Reply */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between group">
              <div className="mb-3">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                  04 · WhatsApp Gönderimi
                </span>
                <h4 className="text-sm font-semibold text-white mt-2">Toplu İletim & Satış</h4>
                <p className="text-xs text-white/50 mt-1">Müşterinin cebine doğrudan video ve teklif.</p>
              </div>
              <div className="relative aspect-[3/4] w-full rounded-xl bg-[#0b141a] p-3.5 flex flex-col justify-between border border-white/10">
                <div className="space-y-2">
                  <div className="bg-[#005c4b] text-white text-[11px] p-2.5 rounded-lg leading-relaxed shadow-sm">
                    🎧 Lansmana özel %20 indirimli NOVA kulaklık stokta. Sipariş için bize yazabilirsiniz!
                    <div className="text-[9px] text-white/60 text-right mt-1">10:42 ✓✓</div>
                  </div>
                  <div className="bg-[#202c33] text-white text-[11px] p-2 rounded-lg leading-relaxed shadow-sm">
                    "Siyah modelinden 1 adet sipariş vermek istiyorum!"
                    <div className="text-[9px] text-white/60 text-right mt-1">10:45</div>
                  </div>
                </div>
                <div className="p-2 rounded bg-brand/20 border border-brand/30 text-[10px] text-brand text-center font-medium font-mono">
                  Sipariş Alındı (2.850 TL)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Part C — Stats (embedded, not separate section) */}
      <div ref={statsRef} className="reveal border-t border-white/[0.06] py-16">
        <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            ['100+', 'Sektör'],
            ['1.000', 'Hazır senaryo'],
            ['8–16 sn', 'Reklam formatı'],
            ['9:16', 'Dikey video'],
          ].map(([num, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl md:text-3xl font-semibold mb-1 font-[family-name:var(--font-jetbrains)]">
                {num}
              </div>
              <div className="text-sm text-white/40">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
