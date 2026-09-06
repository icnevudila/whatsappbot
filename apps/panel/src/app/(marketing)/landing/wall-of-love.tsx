'use client'

import { useLocale } from '@/lib/i18n/provider'
import { ScrollReveal } from './scroll-reveal'

export function WallOfLove() {
  const { messages } = useLocale()
  const L = messages.landing.wall
  const loop = [...L.quotes, ...L.quotes]

  return (
    <section id="yorumlar" className="scroll-mt-16 overflow-hidden border-b border-hairline bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-[clamp(4rem,9vw,6.5rem)]">
        <ScrollReveal className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {L.kicker}
          </p>
          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{L.title}</h2>
          <p className="mt-3 text-[14px] text-ink-muted">{L.lead}</p>
        </ScrollReveal>

        <div className="landing-marquee relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-canvas to-transparent sm:w-16"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-canvas to-transparent sm:w-16"
          />
          <div className="landing-marquee-track">
            {loop.map((item, index) => (
              <figure
                key={`${item.name}-${index}`}
                className="w-[min(100%,20rem)] shrink-0 rounded-[12px] border border-hairline bg-surface p-5 sm:w-[22rem]"
              >
                <blockquote className="text-[13px] leading-relaxed text-ink-muted">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-4 border-t border-hairline pt-3">
                  <p className="text-[13px] font-semibold text-ink">{item.name}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">{item.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
