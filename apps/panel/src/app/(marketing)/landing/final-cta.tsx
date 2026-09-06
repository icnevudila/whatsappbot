import Link from 'next/link'
import { getDictionary } from '@/lib/i18n/server'
import { ScrollReveal } from './scroll-reveal'

export async function FinalCta() {
  const { messages } = await getDictionary()
  const L = messages.landing.final

  return (
    <section
      data-landing-conversion-zone
      className="relative overflow-hidden border-t border-hairline bg-[var(--color-hero)] py-16 text-white sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_70%_20%,rgba(47,91,255,0.28),transparent_60%)]"
      />
      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
        <ScrollReveal>
          <h2 className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">{L.title}</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/75">{L.lead}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Link
              href="/giris?mod=kayit"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-accent px-5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
            >
              {L.ctaPrimary}
            </Link>
            <a
              href="#urun"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-white/20 bg-white/5 px-5 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
            >
              {L.ctaSecondary}
            </a>
          </div>
          <p className="mt-5 text-[12px] text-white/45">
            {L.hasAccount}{' '}
            <Link href="/giris" className="text-white/80 underline-offset-2 hover:underline">
              {L.signIn}
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
