'use client'

import Image from 'next/image'
import { useLocale } from '@/lib/i18n/provider'
import { ScrollReveal } from './scroll-reveal'

const STEP_IMAGES = [
  '/landing/ozet.png',
  '/landing/kisiler.png',
  '/landing/hizli-gonderim.png',
  '/landing/gelenler.png',
  '/landing/gidenler.png',
] as const

export function DayInOps() {
  const { messages } = useLocale()
  const L = messages.landing.day

  return (
    <section id="gun" className="scroll-mt-16 border-b border-hairline bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
        <ScrollReveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {L.kicker}
          </p>
          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{L.title}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{L.lead}</p>
        </ScrollReveal>

        <div className="relative mx-auto max-w-5xl">
          <div
            aria-hidden
            className="absolute bottom-0 left-[19px] top-0 w-px bg-hairline-strong md:left-1/2 md:-translate-x-1/2"
          />
          <div className="space-y-10 md:space-y-14">
            {L.steps.map((step, index) => {
              const flip = index % 2 === 1
              return (
                <div
                  key={step.time}
                  className={`relative flex flex-col md:flex-row md:items-center ${
                    flip ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  <div className="w-full pl-12 md:w-1/2 md:px-10 md:pl-10">
                    <ScrollReveal delay={80}>
                      <div className="rounded-[12px] border border-hairline bg-canvas p-4 shadow-[var(--shadow-card)] sm:p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-ink">
                            {step.time}
                          </span>
                          <h3 className="text-[14.5px] font-semibold">{step.title}</h3>
                        </div>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{step.body}</p>
                        <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-[10px] border border-hairline bg-surface">
                          <Image
                            src={STEP_IMAGES[index]!}
                            alt={step.title}
                            fill
                            className="object-cover object-top"
                            sizes="(max-width: 768px) 100vw, 420px"
                          />
                        </div>
                      </div>
                    </ScrollReveal>
                  </div>
                  <div
                    aria-hidden
                    className="absolute left-[19px] top-5 z-10 size-3 -translate-x-1/2 rounded-full border-2 border-surface bg-accent md:left-1/2"
                  />
                  <div className="hidden md:block md:w-1/2" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
