'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

const FAQS = [
  {
    "q": "Kendi WhatsApp hattımı kullanabilir miyim?",
    "a": "Evet. WhatsApp hattınızı QR kod ile Mesajify’a bağlayabilirsiniz."
  },
  {
    "q": "Birden fazla hat bağlayabilir miyim?",
    "a": "Evet. Paket kapsamınıza göre birden fazla bağlı hattı aynı kampanya panelinden yönetebilirsiniz."
  },
  {
    "q": "Video hazırlamak için teknik bilgi gerekir mi?",
    "a": "Ürün fotoğrafınızı ve kampanya fikrinizi stüdyoya ekleyerek reklam hazırlama akışını başlatabilirsiniz."
  },
  {
    "q": "Kendi logomu videolarda kullanabilir miyim?",
    "a": "Marka logonuzu kreatif hazırlama akışına ekleyebilirsiniz."
  },
  {
    "q": "Excel veya CSV listemi yükleyebilir miyim?",
    "a": "Evet. Excel veya CSV müşteri listenizi aktarabilir, kampanyadan önce kayıtları kontrol edebilirsiniz."
  },
  {
    "q": "Müşteri yanıtlarını nereden görebilirim?",
    "a": "Bağlı hatlarınıza gelen müşteri yanıtlarını Mesajify Gelen Kutusu üzerinden takip edebilirsiniz."
  },
  {
    "q": "İletişim almak istemeyen kişiler ne olur?",
    "a": "Bu kişileri opt-out listesine alarak sonraki kampanyaların dışında tutabilirsiniz."
  },
  {
    "q": "WhatsApp hesabımın kapanmayacağı garanti edilebilir mi?",
    "a": "Hayır. Hiçbir üçüncü taraf yazılım WhatsApp hesabınızın hiçbir koşulda kısıtlanmayacağını garanti edemez. Mesajify kampanya ve hat yönetimini kontrollü yürütmenize, gönderim durumlarını izlemenize ve iletişim almak istemeyen kişileri sonraki kampanyalardan çıkarmanıza yardımcı olur."
  }
]

export function Scene08TrustFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const trustRef = useReveal<HTMLDivElement>()
  const faqRef = useReveal<HTMLDivElement>()

  return (
    <section className="scene bg-[#07100C] text-white scene-pad-lg">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Part A: Trust & Control */}
        <div ref={trustRef} className="reveal grid lg:grid-cols-12 gap-8 lg:gap-16 items-center mb-16 sm:mb-28">
          <div className="lg:col-span-6">
            <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
              {['Kontrollü', 'Görünür', 'Ölçülebilir', 'Yönetilebilir'].map((badge) => (
                <span
                  key={badge}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 text-xs font-medium border border-white/10 text-white/80"
                >
                  {badge}
                </span>
              ))}
            </div>

            <h2 className="text-[clamp(32px,5vw,72px)] leading-[1.06] font-[600] tracking-tight mb-4 sm:mb-6">
              Kontrol sizde.
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/50 leading-relaxed mb-8 sm:mb-10 max-w-lg">
              Hat durumlarını, kampanya ilerlemesini ve müşteri yanıtlarını aynı panelden izleyin.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[
                'Hat durumları',
                'Gönderim raporları',
                'Opt-out yönetimi',
                'Kampanya kontrolleri',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-white/80">
                  <div className="w-5 h-5 rounded-full bg-brand/20 text-brand flex items-center justify-center text-xs font-bold shrink-0">
                    ✓
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot crop */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-white/10 bg-[#0f1a14] overflow-hidden shadow-2xl">
              <div className="h-9 bg-black/40 border-b border-white/10 flex items-center px-4 gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="text-[11px] font-[family-name:var(--font-jetbrains)] text-white/30 ml-2">Sistem Durumu</span>
              </div>
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/landing/durum.png"
                  alt="Mesajify Kontrol Ekranı"
                  fill
                  className="object-cover object-top opacity-95"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Part B: FAQ Accordion */}
        <div ref={faqRef} className="reveal pt-12 sm:pt-20 border-t border-white/10 max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl md:text-5xl font-[600] tracking-tight mb-3 sm:mb-4">
              Sıkça Sorulan Sorular
            </h3>
            <p className="text-white/45 text-sm sm:text-base">Aklınıza takılan soruların açık ve dürüst yanıtları.</p>
          </div>

          <div className="divide-y divide-white/10">
            {FAQS.map((faq, i) => {
              const isOpen = openIdx === i
              return (
                <div key={i} className="py-5 sm:py-6">
                  <button
                    id={`faq-question-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="w-full flex items-center justify-between text-left group gap-4"
                  >
                    <span className="text-base sm:text-lg font-medium text-white group-hover:text-brand transition-colors">
                      {faq.q}
                    </span>
                    <span aria-hidden="true" className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/10 flex items-center justify-center text-xs sm:text-sm shrink-0 transition-transform duration-300 text-white/60 ${isOpen ? 'rotate-180 bg-white/10' : ''}`}>
                      ↓
                    </span>
                  </button>
                  
                    <div hidden={!isOpen} id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`} className="mt-3 sm:mt-4 pr-6 sm:pr-12 animate-fade-in">
                      <p className="text-white/60 text-sm sm:text-base leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </section>
  )
}
