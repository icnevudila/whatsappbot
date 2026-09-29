'use client'

import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

export function Scene05Inbox() {
  const headRef = useReveal<HTMLDivElement>()
  const frameRef = useReveal<HTMLDivElement>(0.1)

  return (
    <section className="scene bg-canvas scene-pad-lg overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Narrative Headline */}
        <div ref={headRef} className="reveal text-center max-w-3xl mx-auto mb-16">
          <p className="font-[family-name:var(--font-jetbrains)] text-[11px] font-medium tracking-[0.12em] uppercase text-ink-muted mb-6">
            MÜŞTERİ YANITI → ORTAK GELEN KUTUSU
          </p>
          <h2 className="text-[clamp(36px,5.5vw,76px)] leading-[1.04] font-[600] tracking-tight text-ink mb-6">
            Mesaj gitti.
            <br />
            Müşteri cevap verdi.
            <br />
            <span className="text-brand">Cevap burada.</span>
          </h2>
          <p className="text-xl text-ink-muted max-w-xl mx-auto leading-relaxed">
            Telefon aramayın. 5 ayrı WhatsApp Web sekmesi açmayın. Tüm hatlardan gelen müşteri soruları tek ekranda toplanır, ekibiniz anında satışa dönüştürür.
          </p>
        </div>

        {/* SIGNATURE MOMENT 03: The Giant Real Unified Inbox Viewport */}
        <div ref={frameRef} className="reveal relative mx-auto max-w-[1140px] rounded-3xl border border-hairline-strong bg-white shadow-2xl shadow-black/5 overflow-hidden">
          
          {/* Top Browser Bar */}
          <div className="h-11 bg-surface border-b border-hairline flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-black/15" />
              <div className="w-3 h-3 rounded-full bg-black/15" />
              <div className="w-3 h-3 rounded-full bg-black/15" />
            </div>
            <div className="px-4 py-1 rounded-md bg-white border border-hairline text-xs font-[family-name:var(--font-jetbrains)] text-ink-muted">
              app.mesajify.com/gelen-kutusu
            </div>
            <div className="w-10" />
          </div>

          {/* Real Application Screenshot */}
          <div className="relative w-full aspect-[16/10] bg-surface">
            <Image
              src="/landing/gelenler.png"
              alt="Mesajify Ortak Gelen Kutusu Gerçek Ekran Görüntüsü"
              fill
              priority
              className="object-cover object-top"
            />

            {/* Hotspot 01: Hatlar ve Konuşmalar */}
            <div className="absolute top-[28%] left-[18%] group cursor-pointer">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-8 h-8 rounded-full bg-brand/30 animate-ping" />
                <span className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs shadow-lg">
                  01
                </span>
              </div>
              <div className="absolute left-10 top-0 bg-[#07100C] text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-90 shadow-xl border border-white/10 hidden sm:block">
                Tüm hatlardan gelen sohbetler
              </div>
            </div>

            {/* Hotspot 02: Müşteri Profili */}
            <div className="absolute top-[35%] left-[54%] group cursor-pointer">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-8 h-8 rounded-full bg-brand/30 animate-ping delay-100" />
                <span className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs shadow-lg">
                  02
                </span>
              </div>
              <div className="absolute left-10 top-0 bg-[#07100C] text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-90 shadow-xl border border-white/10 hidden sm:block">
                Hangi kampanyaya yanıt verdi?
              </div>
            </div>

            {/* Hotspot 03: Ekip Yanıtı */}
            <div className="absolute top-[68%] left-[78%] group cursor-pointer">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-8 h-8 rounded-full bg-brand/30 animate-ping delay-200" />
                <span className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs shadow-lg">
                  03
                </span>
              </div>
              <div className="absolute -left-28 -top-8 bg-[#07100C] text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-90 shadow-xl border border-white/10 hidden sm:block">
                Satış ekibiniz tek tıkla yanıtlar
              </div>
            </div>

          </div>

          {/* Under-frame value bar */}
          <div className="bg-white p-6 md:p-8 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-ink">Canlı Senkronize WhatsApp Web Entegrasyonu</span>
            </div>
            <span className="text-xs font-[family-name:var(--font-jetbrains)] text-ink-muted">
              Temsilci ataması · Hızlı yanıt şablonları · Satış etiketleri
            </span>
          </div>

        </div>

      </div>
    </section>
  )
}
