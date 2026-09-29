'use client'

import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

export function Scene09FinalCta() {
  const ctaRef = useReveal<HTMLDivElement>()

  return (
    <section className="scene bg-[#050B08] text-white py-36 relative overflow-hidden border-t border-white/5">
      
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-brand/10 rounded-full blur-[140px] pointer-events-none" />

      <div ref={ctaRef} className="reveal max-w-[1240px] mx-auto px-6 relative z-10 text-center">
        
        {/* Logo Symbol */}
        <div className="w-14 h-14 mx-auto mb-10 opacity-70">
          <Image
            src="/logos/mesajify_app_icon_corporate_squircle.png"
            alt="Mesajify"
            width={56}
            height={56}
            className="rounded-2xl"
          />
        </div>

        {/* Narrative Headline */}
        <h2 className="text-[clamp(44px,6.5vw,88px)] leading-[1.02] font-[600] tracking-tight mb-8">
          Bir fotoğraftan
          <br />
          <span className="text-brand">müşteri konuşmasına.</span>
        </h2>

        <p className="text-xl text-white/50 mb-12 max-w-xl mx-auto leading-relaxed">
          Kampanyanızı Mesajify ile oluşturun, WhatsApp'tan güvenle ulaştırın ve tüm yanıtları tek ekrandan yönetin.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://app.mesajify.com/giris"
            className="w-full sm:w-auto px-8 py-4 bg-brand text-white rounded-xl font-medium text-base hover:bg-brand-hover transition-colors shadow-lg shadow-brand/20"
          >
            İlk Kampanyanı Oluştur →
          </a>
          <a
            href="#urun"
            className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-medium text-base hover:bg-white/10 transition-colors"
          >
            Örnekleri İzle
          </a>
        </div>

        {/* Domain signoff */}
        <p className="mt-20 text-xs text-white/30 font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase">
          mesajify.com
        </p>

      </div>
    </section>
  )
}
