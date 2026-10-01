'use client'

import { FinalJourney } from '../visuals/product-modules'
import { MesajifyMark } from '../brand/mesajify-mark'
import { useReveal } from '@/lib/use-reveal'

export function Scene09FinalCta() {
  const ctaRef = useReveal<HTMLDivElement>()

  return (
    <section className="scene ml-final-section py-20 sm:py-28 relative overflow-hidden border-t border-[#dce5df]">
      
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-brand/10 rounded-full blur-[140px] pointer-events-none" />

      <div ref={ctaRef} className="reveal max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10 text-center">
        
        {/* Logo Symbol */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-8 sm:mb-10 opacity-70">
          <MesajifyMark variant="symbol" size="md" state="success" />
        </div>

        {/* Narrative Headline */}
        <h2 className="text-[clamp(34px,5vw,64px)] leading-[1.05] font-[450] tracking-tight mb-6 sm:mb-8">
          İşletmenizi tanıtın.
          <br />
          <span className="text-brand">Konuşmayı başlatın.</span>
        </h2>

        <p className="text-base sm:text-lg md:text-xl text-[#64736a] mb-8 sm:mb-12 max-w-xl mx-auto leading-relaxed">
          Hedef kitlenizi hazırlayın, ürününüzü veya hizmetinizi WhatsApp’tan duyurun ve gelen yanıtları tek yerde takip edin.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <a
            href="https://app.mesajify.com/giris"
            className="w-full sm:w-auto px-8 py-4 bg-brand text-white rounded-xl font-semibold text-base hover:bg-brand-hover transition-colors shadow-lg shadow-brand/20 text-center"
          >
            Hemen Başla →
          </a>
          <a
            href="#urun"
            className="w-full sm:w-auto px-8 py-4 bg-white border border-[#dce5df] text-[#21382c] rounded-xl font-medium text-base hover:bg-[#eef5ef] transition-colors text-center"
          >
            Örnekleri İzle
          </a>
        </div>

        <div className="ml-product-story ml-cta-journey" aria-label="Kitle, tanıtım ve müşteri yanıtı"><FinalJourney /></div>

        {/* Domain signoff */}
        <p className="mt-12 sm:mt-20 text-xs text-[#64736a] tracking-[0.2em] uppercase font-medium">
          mesajify.com
        </p>

      </div>
    </section>
  )
}
