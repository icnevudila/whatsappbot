'use client'

import { useLocale } from '@/lib/i18n/provider'
import { ScrollReveal } from './scroll-reveal'

export function SocialProofStrip() {
  const { messages } = useLocale()
  const proof = messages.landing.proof

  return (
    <section className="border-b border-hairline bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <ScrollReveal>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {proof.map((item) => (
              <div key={item.label} className="text-center md:text-left">
                <p className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{item.label}</p>
                <p className="mt-1 text-[12px] text-ink-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
