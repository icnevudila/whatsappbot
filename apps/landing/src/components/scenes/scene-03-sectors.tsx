'use client'

import { useState } from 'react'
import { useReveal } from '@/lib/use-reveal'

const sectors = [
  {
    id: 'eticaret',
    label: 'E-Ticaret',
    msg: 'Yeni koleksiyonumuz yayında ✨\nÜrünleri keşfetmek ve detay almak için bize yazabilirsiniz.',
    reply: 'Siyah modeli mevcut mu?',
  },
  {
    id: 'restoran',
    label: 'Restoran',
    msg: 'Bu akşam sofranız hazır 🍽️\nMenü ve rezervasyon için bize yazabilirsiniz.',
    reply: '20:00 için 2 kişilik yeriniz var mı?',
  },
  {
    id: 'otomotiv',
    label: 'Otomotiv',
    msg: 'Yeni araçlarımızı keşfedin.\nModel ve detaylar için bize yazabilirsiniz.',
    reply: 'Bu model hakkında bilgi alabilir miyim?',
  },
  {
    id: 'emlak',
    label: 'Emlak',
    msg: 'Yeni portföyümüz yayında.\nDetaylar ve görüşme için bize yazabilirsiniz.',
    reply: 'Daireyi ne zaman görebilirim?',
  },
  {
    id: 'klinik',
    label: 'Klinik',
    msg: 'Kontrol randevularımız açıldı.\nBilgi almak için bize yazabilirsiniz.',
    reply: 'En yakın boş tarih hangisi?',
  },
  {
    id: 'hizmet',
    label: 'Hizmet',
    msg: 'Bu hafta için randevu saatleri açıldı.\nUygun saatleri öğrenmek için bize yazabilirsiniz.',
    reply: 'Cumartesi uygun musunuz?',
  },
]

export function Scene03Sectors() {
  const [active, setActive] = useState(0)
  const headRef = useReveal<HTMLDivElement>()
  const data = sectors[active]

  return (
    <section className="scene bg-canvas scene-pad">
      <div className="max-w-[1240px] mx-auto px-6">
        <div ref={headRef} className="reveal mb-20">
          <h2 className="text-[clamp(36px,5vw,72px)] leading-[1.06] font-[600] tracking-tight text-center">
            İşletmeni seç.
            <br />
            Kampanyanı gör.
          </h2>
        </div>

        {/* Sector pills */}
        <div className="flex overflow-x-auto gap-2 justify-start md:justify-center mb-16 pb-2 scrollbar-none">
          {sectors.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                active === i
                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                  : 'bg-surface text-ink-muted hover:text-ink border border-hairline'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Large WhatsApp-style conversation — NOT inside a tiny card */}
        <div className="max-w-2xl mx-auto">
          {/* Outgoing campaign message */}
          <div className="flex justify-end mb-4">
            <div
              key={`msg-${active}`}
              className="bg-[#d9fdd3] rounded-2xl rounded-tr-sm px-6 py-4 max-w-[80%] shadow-sm"
              style={{ animation: 'fadeInUp 0.4s var(--ease-enter)' }}
            >
              <p className="text-[15px] leading-relaxed text-ink whitespace-pre-line">
                {data.msg}
              </p>
              <div className="flex justify-end items-center gap-1 mt-2">
                <span className="text-[10px] text-ink-faint">10:42</span>
                <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                  <path d="M1 5.5L5 9.5L11 1.5" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 5.5L9 9.5L15 1.5" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Incoming customer reply */}
          <div className="flex justify-start">
            <div
              key={`reply-${active}`}
              className="bg-white rounded-2xl rounded-tl-sm px-6 py-4 max-w-[70%] shadow-sm border border-hairline"
              style={{
                animation: 'fadeInUp 0.4s var(--ease-enter)',
                animationDelay: '250ms',
                animationFillMode: 'both',
              }}
            >
              <p className="text-[15px] leading-relaxed text-ink">
                {data.reply}
              </p>
              <div className="flex justify-end mt-2">
                <span className="text-[10px] text-ink-faint">10:45</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
