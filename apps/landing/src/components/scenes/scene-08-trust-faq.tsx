'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

const FAQS = [
  {
    q: 'Kendi WhatsApp hattımı kullanabilir miyim?',
    a: "Evet. Mevcut işletme numaranızı veya dilediğiniz bir SIM hattı QR kod okutarak saniyeler içinde Mesajify'a bağlayabilirsiniz."
  },
  {
    q: 'Birden fazla hat bağlayabilir miyim?',
    a: 'Evet. Paket kapsamınıza göre birden fazla hattı aynı havuza dahil edebilir, kampanyalarınızın bu hatlar arasında otomatik dağıtılmasını sağlayabilirsiniz.'
  },
  {
    q: 'Video hazırlamak için teknik bilgi veya ajans gerekir mi?',
    a: 'Hayır. Sadece ürün fotoğrafınızı yüklemeniz veya kampanyanızı tek cümleyle tarif etmeniz yeterlidir. Mesajify AI stüdyosu senaryoyu, videoyu, Türkçe seslendirmeyi ve altyazıları otomatik üretir.'
  },
  {
    q: 'Kendi logomu ve marka renklerimi videolarda kullanabilir miyim?',
    a: 'Evet. Marka kitinizi (logo, renk kodları, font tercihi) bir kez yüklersiniz, üretilen tüm video ve görseller kurumsal kimliğinize uygun olarak tamamlanır.'
  },
  {
    q: 'Excel veya CSV müşteri listemi nasıl yüklerim?',
    a: 'Bilgisayarınızdaki mevcut Excel (.xlsx) veya CSV dosyasını sürükleyip bırakmanız yeterlidir. Sistem isim, numara ve özel alanları otomatik olarak eşleştirir.'
  },
  {
    q: 'Müşteri yanıt verdiğinde ne olur?',
    a: "Müşterinin yanıtı cep telefonuna veya WhatsApp Web'e değil, doğrudan Mesajify Gelen Kutusu'na düşer. Telefonlar arasında geçiş yapmadan tüm konuşmaları tek ekrandan yönetip satışa çevirebilirsin."
  },
  {
    q: 'İletişim almak istemeyen müşteriler ne olur?',
    a: 'Mesajify opt-out anahtar kelimelerini otomatik tanır veya tek tıkla ilgili numarayı kara listeye alır. Sonraki hiçbir kampanyada bu kişiye tekrar mesaj gönderilmez.'
  },
  {
    q: 'WhatsApp hesabımın kapanmayacağı garanti edilebilir mi?',
    a: 'Hayır. Hiçbir dürüst yazılım WhatsApp hesabınız için "kapanmaz" garantisi veremez. Mesajify; kampanya hacmini yönetmenize, hatlarınızı kontrollü kullanmanıza, gönderim durumlarını izlemenize ve iletişim almak istemeyen kişileri sonraki kampanyalardan çıkarmanıza yardımcı olur. WhatsApp politikalarına ve izinli pazarlama kurallarına uygun kullanım işletmenin sorumluluğundadır.'
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
        <div ref={trustRef} className="reveal grid lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-28">
          <div className="lg:col-span-6">
            <div className="flex flex-wrap gap-2 mb-8">
              {['Kontrollü', 'Görünür', 'Ölçülebilir', 'Yönetilebilir'].map((badge) => (
                <span
                  key={badge}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 text-xs font-[family-name:var(--font-jetbrains)] border border-white/10 text-white/80"
                >
                  {badge}
                </span>
              ))}
            </div>

            <h2 className="text-[clamp(36px,5vw,72px)] leading-[1.04] font-[600] tracking-tight mb-6">
              Kontrol sizde.
            </h2>
            <p className="text-xl text-white/50 leading-relaxed mb-10 max-w-lg">
              Gizli algoritmalar veya arka kapı hileleri yok. Kampanyanızın her adımını, her saniyesini şeffaf olarak panelinizden izleyin.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {[
                'Anlık Hat Durumu',
                'İletim & Okunma Raporu',
                'Otomatik Kara Liste',
                'Gönderim Hız Limiti',
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
        <div ref={faqRef} className="reveal pt-20 border-t border-white/10 max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-5xl font-[600] tracking-tight mb-4">
              Sıkça Sorulan Sorular
            </h3>
            <p className="text-white/45 text-base">Aklınıza takılan soruların açık ve dürüst yanıtları.</p>
          </div>

          <div className="divide-y divide-white/10">
            {FAQS.map((faq, i) => {
              const isOpen = openIdx === i
              return (
                <div key={i} className="py-6">
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="w-full flex items-center justify-between text-left group gap-4"
                  >
                    <span className="text-lg font-medium text-white group-hover:text-brand transition-colors">
                      {faq.q}
                    </span>
                    <span className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-sm shrink-0 transition-transform duration-300 text-white/60 ${isOpen ? 'rotate-180 bg-white/10' : ''}`}>
                      ↓
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-4 pr-12 animate-fade-in">
                      <p className="text-white/60 text-base leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </section>
  )
}
