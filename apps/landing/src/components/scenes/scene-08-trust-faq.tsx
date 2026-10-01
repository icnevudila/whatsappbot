'use client'

import { useState } from 'react'
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
  const faqRef = useReveal<HTMLDivElement>()

  return (
    <section className="scene bg-[#f8faf8] border-t border-[#dce5df] text-[#111a16] py-20 sm:py-28">
      <div className="max-w-[1240px] mx-auto px-6">
        <div ref={faqRef} className="reveal max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-xs font-semibold tracking-wider text-brand uppercase mb-2 block">
              Merak Edilenler
            </span>
            <h3 className="text-2xl sm:text-3xl md:text-5xl font-[600] tracking-tight mb-3 sm:mb-4 text-[#111a16]">
              Sıkça Sorulan Sorular
            </h3>
            <p className="text-[#5c6b61] text-sm sm:text-base">
              Aklınıza takılan soruların açık ve dürüst yanıtları.
            </p>
          </div>

          <div className="divide-y divide-[#dce5df] bg-white rounded-2xl border border-[#dce5df] p-6 sm:p-8 shadow-sm">
            {FAQS.map((faq, i) => {
              const isOpen = openIdx === i
              return (
                <div key={i} className="py-5 sm:py-6 first:pt-0 last:pb-0">
                  <button
                    id={`faq-question-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="w-full flex items-center justify-between text-left group gap-4"
                  >
                    <span className="text-base sm:text-lg font-medium text-[#111a16] group-hover:text-brand transition-colors">
                      {faq.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#dce5df] flex items-center justify-center text-xs sm:text-sm shrink-0 transition-transform duration-300 text-[#5c6b61] ${
                        isOpen ? 'rotate-180 bg-[#e5f4ec] text-[#168347] border-[#00a884]' : 'bg-[#f8faf8]'
                      }`}
                    >
                      ↓
                    </span>
                  </button>

                  <div
                    hidden={!isOpen}
                    id={`faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`faq-question-${i}`}
                    className="mt-3 sm:mt-4 pr-6 sm:pr-12 animate-fade-in"
                  >
                    <p className="text-[#5c6b61] text-sm sm:text-base leading-relaxed">
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
