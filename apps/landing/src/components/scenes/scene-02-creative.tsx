'use client'

import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

export function Scene02CreativeStudio() {
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

          {/* Inline creation steps — replacing old creative-engine checklist */}
          <div className="mt-16 flex flex-wrap gap-x-3 gap-y-2 text-sm font-[family-name:var(--font-jetbrains)] text-white/30">
            {[
              'Ürün fotoğrafı',
              'AI kreatif',
              '9:16 video',
              'Türkçe ses',
              'Altyazı',
              'Marka',
              'WhatsApp\'a hazır',
            ].map((step, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />
                {step}
                {i < 6 && <span className="text-white/15 ml-1">→</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Part B — Cinematic video showcase (full bleed feel) */}
      <div ref={videosRef} className="reveal max-w-[1400px] mx-auto px-6 pb-24">
        <div className="flex flex-col md:flex-row items-end justify-center gap-6">
          {/* Left — Restaurant */}
          <div className="w-full md:w-[260px] aspect-[9/16] rounded-2xl overflow-hidden bg-dark-surface border border-white/5 shrink-0 opacity-80 hover:opacity-100 transition-opacity duration-500 relative group">
            {/* Mesajify Brand Overlay Badge */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-lg">
              <Image src="/logos/mesajify_app_icon_corporate_squircle.png" width={16} height={16} alt="Mesajify" className="rounded-sm" />
              <span className="text-[10px] font-[family-name:var(--font-jetbrains)] text-white/90 font-medium">Mesajify Flow AI</span>
            </div>
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="/landing/studio/bakery-croissant-ad.png"
              className="w-full h-full object-cover"
            >
              <source src="/landing/studio/restaurant.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Center — Product (HERO) */}
          <div className="w-full md:w-[320px] aspect-[9/16] rounded-3xl overflow-hidden bg-dark-surface border border-white/10 shadow-2xl shadow-brand/10 shrink-0 relative z-10 group">
            {/* Mesajify Brand Overlay Badge */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 shadow-xl">
              <Image src="/logos/mesajify_app_icon_corporate_squircle.png" width={18} height={18} alt="Mesajify" className="rounded-sm" />
              <span className="text-[11px] font-[family-name:var(--font-jetbrains)] text-white font-medium">Mesajify Stüdyo</span>
            </div>
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="/landing/studio/product-poster.jpg"
              className="w-full h-full object-cover"
            >
              <source src="/landing/studio/product.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Right — Newly Generated E-commerce Ad (NOVA) */}
          <div className="w-full md:w-[260px] aspect-[9/16] rounded-2xl overflow-hidden bg-dark-surface border border-white/10 shrink-0 relative group">
            <Image
              src="/landing/studio/nova-headphones-ad.png"
              alt="NOVA Kulaklık Reklam Kreatifi"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
              <span className="text-[11px] font-[family-name:var(--font-jetbrains)] text-brand font-medium uppercase tracking-wider">
                E-Ticaret Kreatifi
              </span>
              <span className="text-sm font-semibold text-white mt-1">
                NOVA Kablosuz Kulaklık
              </span>
            </div>
          </div>
        </div>
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
