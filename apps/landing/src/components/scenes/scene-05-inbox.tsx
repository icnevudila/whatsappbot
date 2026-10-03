'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

const CONVERSATIONS = [
  {
    name: 'Ayşe Yıldız',
    phone: '+90 532 ••• •• 78',
    line: 'Hat 01 (Restoran Hattı)',
    customerMsg: '"Kampanyadaki kruvasan ve kahve menünüz için bugün 14:00\'e 2 kişilik yeriniz var mı?"',
    reply: 'Sen: "Masanız #4 rezerve edilmiştir, sizleri ağırlamaktan mutluluk duyarız."',
    badge: 'Masa Rezerve Edildi',
  },
  {
    name: 'Ahmet Yılmaz',
    phone: '+90 542 ••• •• 12',
    line: 'Hat 02 (E-Ticaret Hattı)',
    customerMsg: '"NOVA Kablosuz Kulaklık lansman indiriminden faydalanmak istiyorum. Siyah model stokta var mı?"',
    reply: 'Sen: "Evet Ahmet Bey, lansman kodunuz tanımlandı. Siparişiniz kargoya hazır."',
    badge: 'Sipariş Alındı (2.850 TL)',
  },
  {
    name: 'Burak Demir',
    phone: '+90 552 ••• •• 45',
    line: 'Hat 03 (Danışmanlık Hattı)',
    customerMsg: '"Pazartesi 10:00 dijital operasyon büyüme analizi toplantısı için uygun musunuz?"',
    reply: 'Sen: "Takvim daveti e-posta ve WhatsApp üzerinden onaylanmıştır Burak Bey."',
    badge: 'Görüşme Onaylandı',
  },
]

export function Scene05Inbox() {
  const [activeConv, setActiveConv] = useState(0)
  const current = CONVERSATIONS[activeConv]
  const headRef = useReveal<HTMLDivElement>()
  const frameRef = useReveal<HTMLDivElement>(0.1)

  return (
    <section className="scene bg-canvas scene-pad-lg overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Narrative Headline */}
        <div ref={headRef} className="reveal text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <p className="text-xs font-semibold text-brand tracking-normal uppercase mb-4 sm:mb-6">
            Ortak Gelen Kutusu
          </p>
          <h2 className="text-[clamp(32px,5.5vw,76px)] leading-[1.08] font-[600] tracking-tight text-ink mb-4 sm:mb-6">
            Mesaj gitti.
            <br />
            Müşteri cevap verdi.
            <br />
            <span className="text-brand">Cevap burada.</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-ink-muted max-w-xl mx-auto leading-relaxed">
            Telefon aramayın. 5 ayrı WhatsApp Web sekmesi arasında kaybolmayın. Tüm bağlı hatlarınızdan gelen müşteri soruları tek ekranda toplanır, anında yanıtlayıp satışa dönüştürürsünüz.
          </p>
        </div>

        {/* SIGNATURE MOMENT 03: The Giant Real Unified Inbox Viewport */}
        <div ref={frameRef} className="reveal relative mx-auto max-w-[1140px] rounded-2xl sm:rounded-3xl border border-hairline-strong bg-white shadow-2xl shadow-black/5 overflow-hidden">
          
          {/* Top Browser Bar */}
          <div className="h-10 sm:h-11 bg-surface border-b border-hairline flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-black/15" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-black/15" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-black/15" />
            </div>
            <div className="px-3 sm:px-4 py-0.5 sm:py-1 rounded-md bg-white border border-hairline text-[11px] sm:text-xs font-[family-name:var(--font-jetbrains)] text-ink-muted">
              app.mesajify.com/gelen-kutusu
            </div>
            <div className="w-6 sm:w-10" />
          </div>

          {/* Real Application Live Veo Video */}
          <div className="relative w-full aspect-[16/10] bg-slate-950 overflow-hidden">
            <video
              src="/landing/infographics/04-ortak-inbox-veo-i2v.mp4"
              poster="/landing/infographics/04-ortak-inbox-chatgpt-16-9.png"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover object-top"
            />
          </div>

          {/* Interactive Multi-Line Live Dialogue Drawer */}
          <div className="bg-surface/60 border-t border-hairline p-4 sm:p-6 md:p-8">
            <div className="flex flex-col lg:flex-row items-stretch gap-4 sm:gap-6">
              {/* Left: Hat Switcher Column */}
              <div className="w-full lg:w-72 shrink-0 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1 col-span-full">
                  Bağlı Hatlar ve Gelenler
                </div>
                {CONVERSATIONS.map((c, idx) => (
                  <button
                    key={c.name}
                    onClick={() => setActiveConv(idx)}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                      activeConv === idx
                        ? 'bg-white border-brand shadow-sm ring-1 ring-brand/20'
                        : 'bg-white/60 border-hairline hover:bg-white text-ink-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        activeConv === idx ? 'bg-brand text-white' : 'bg-surface text-ink-muted'
                      }`}>
                        0{idx + 1}
                      </div>
                      <div className="truncate">
                        <div className={`text-xs font-semibold truncate ${activeConv === idx ? 'text-ink' : 'text-ink-muted'}`}>
                          {c.line.replace(' (', ' · ').replace(')', '')}
                        </div>
                        <div className="text-[11px] text-ink-muted truncate">{c.name}</div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </button>
                ))}
              </div>

              {/* Right: Live Dialogue & Quick Response Card */}
              <div className="flex-1 bg-white p-5 md:p-6 rounded-2xl border border-hairline shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-hairline">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                        {current.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink flex items-center gap-2">
                          {current.name}
                          <span className="text-xs text-ink-muted font-normal">{current.phone}</span>
                        </div>
                        <div className="text-xs text-brand font-medium">{current.line}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">
                      {current.badge}
                    </span>
                  </div>

                  {/* Message Exchange */}
                  <div className="mt-4 space-y-3">
                    <div className="max-w-[85%] bg-surface p-3.5 rounded-2xl rounded-tl-sm text-xs text-ink leading-relaxed">
                      <span className="block text-[10px] text-ink-muted mb-1">Müşteri Mesajı</span>
                      {current.customerMsg}
                    </div>
                    <div className="max-w-[85%] ml-auto bg-emerald-50 text-emerald-900 border border-emerald-100 p-3.5 rounded-2xl rounded-tr-sm text-xs leading-relaxed">
                      <span className="block text-[10px] text-emerald-700 mb-1 font-semibold">Senin Hızlı Yanıtın</span>
                      {current.reply}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-xs text-ink-muted">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>WhatsApp Web Anlık Senkronizasyon</span>
                  </div>
                  <span className="font-medium text-ink">Ortalama Yanıt: &lt; 30 sn</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
