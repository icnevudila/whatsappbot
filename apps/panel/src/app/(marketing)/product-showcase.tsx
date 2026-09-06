'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ProductFrame } from './product-frame'

const TABS = [
  {
    id: 'kampanyalar',
    label: 'Kampanyalar',
    lead: 'Listeyi ve hatları seçin, mesajı yazın. Gönderim arka planda sürer.',
    src: '/landing/raporlar.png',
    alt: 'Filo raporlar ve kampanya özeti ekranı',
    caption: 'Raporlar · kampanya performansı',
  },
  {
    id: 'hesaplar',
    label: 'Hesaplar',
    lead: 'Birden fazla hattı QR ile bağlayın, kotayı canlı görün.',
    src: '/landing/hesaplar.png',
    alt: 'Filo hesaplar ekranı — demo hatlar',
    caption: 'Hesaplar · çoklu hat',
  },
  {
    id: 'ozet',
    label: 'Özet',
    lead: 'Günün operasyon görünümü: hatlar, defter, trafik ve kısayollar.',
    src: '/landing/ozet.png',
    alt: 'Filo özet paneli',
    caption: 'Özet · workbench',
  },
] as const

/**
 * Dişçi landing FeaturesShowcase kalıbı + sanitize edilmiş panel screenshot’ları.
 * Demo video hero’da (ilk viewport).
 */
export function ProductShowcase() {
  const [active, setActive] = useState(0)
  const tab = TABS[active]!

  return (
    <section id="urun" className="scroll-mt-16 border-b border-hairline bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            Ürün
          </p>
          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">
            Panelin içinden kampanya akışı
          </h2>
          <p className="mt-3 max-w-[40rem] text-[14px] leading-relaxed text-ink-muted">
            Gerçek arayüz görüntüleri. Numaralar ve sohbetler demo kampanya verisiyle değiştirildi.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TABS.map((item, index) => {
            const on = index === active
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(index)}
                className={`h-9 rounded-[var(--radius-sm)] px-3 text-[12.5px] font-medium transition-colors ${
                  on
                    ? 'bg-accent text-accent-ink'
                    : 'border border-hairline-strong bg-surface text-ink-muted hover:bg-surface-raised hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <p className="mt-4 max-w-xl text-[13px] text-ink-muted">{tab.lead}</p>

        <div className="mt-6">
          <ProductFrame caption={tab.caption}>
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-canvas">
              <Image
                src={tab.src}
                alt={tab.alt}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 960px"
                priority={active === 0}
              />
            </div>
          </ProductFrame>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { src: '/landing/hizli-gonderim.png', label: 'Hızlı gönderim' },
            { src: '/landing/kisiler.png', label: 'Kişiler' },
            { src: '/landing/durum.png', label: 'Durum' },
          ].map((card) => (
            <div
              key={card.src}
              className="overflow-hidden rounded-[12px] border border-hairline bg-surface shadow-[var(--shadow-card)]"
            >
              <div className="relative aspect-[16/11]">
                <Image
                  src={card.src}
                  alt={`Filo ${card.label}`}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100vw, 320px"
                />
              </div>
              <p className="border-t border-hairline px-3 py-2 text-[12px] font-medium text-ink-muted">
                {card.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
