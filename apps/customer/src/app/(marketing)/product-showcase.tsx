'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale } from '@/lib/i18n/provider'
import { ProductFrame } from './product-frame'

const TAB_SRC = ['/landing/raporlar.png', '/landing/hesaplar.png', '/landing/ozet.png'] as const
const CARD_SRC = [
  '/landing/hizli-gonderim.png',
  '/landing/kisiler.png',
  '/landing/durum.png',
] as const

export function ProductShowcase() {
  const { messages } = useLocale()
  const L = messages.landing.showcase
  const [active, setActive] = useState(0)
  const tab = L.tabs[active]!

  return (
    <section id="urun" className="scroll-mt-16 border-b border-hairline bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {L.kicker}
          </p>
          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{L.title}</h2>
          <p className="mt-3 max-w-[40rem] text-[14px] leading-relaxed text-ink-muted">{L.lead}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {L.tabs.map((item, index) => {
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
                src={TAB_SRC[active]!}
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
          {L.cards.map((card, index) => (
            <div
              key={card.label}
              className="overflow-hidden rounded-[12px] border border-hairline bg-surface shadow-[var(--shadow-card)]"
            >
              <div className="relative aspect-[16/11]">
                <Image
                  src={CARD_SRC[index]!}
                  alt={card.label}
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
