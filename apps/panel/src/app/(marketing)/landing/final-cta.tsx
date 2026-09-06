'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n/provider'
import { ScrollReveal } from './scroll-reveal'

export function FinalCta() {
  const { messages } = useLocale()
  const L = messages.landing.final

  return (
    <section
      data-landing-conversion-zone
      className="relative overflow-hidden border-t border-hairline bg-surface py-16 sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(47,91,255,0.1),transparent_60%)]"
      />
      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
        <ScrollReveal>
          <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-ink sm:text-[34px]">
            {L.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">{L.lead}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Link
              href="/giris?mod=kayit"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-accent px-5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
            >
              {L.ctaPrimary}
            </Link>
            <a
              href="#urun"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-hairline-strong bg-canvas px-5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-raised"
            >
              {L.ctaSecondary}
            </a>
          </div>
          <p className="mt-5 text-[12px] text-ink-faint">
            {L.hasAccount}{' '}
            <Link href="/giris" className="text-ink-muted underline-offset-2 hover:text-ink hover:underline">
              {L.signIn}
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
