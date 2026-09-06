import type { Metadata } from 'next'
import Link from 'next/link'
import { PLAN_QUOTAS, type PlanId } from '@wa/shared'
import { BRAND_NAME, LogoMark } from '@/components/brand'
import { getDictionary } from '@/lib/i18n/server'
import { CapacityCalculator } from './capacity-calculator'
import { HeroPanel } from './hero-panel'
import { DayInOps } from './landing/day-in-ops'
import { FinalCta } from './landing/final-cta'
import { ProblemSection } from './landing/problem-section'
import { LandingScrollTop } from './landing/scroll-top'
import { SocialProofStrip } from './landing/social-proof'
import { StickyCta } from './landing/sticky-cta'
import { WallOfLove } from './landing/wall-of-love'
import { ProductShowcase } from './product-showcase'
import './landing/landing.css'

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getDictionary()
  const L = messages.landing
  return {
    title: { absolute: L.metaTitle },
    description: L.metaDescription,
    openGraph: {
      title: L.metaTitle,
      description: L.metaDescription,
    },
  }
}

const PLAN_IDS = ['free', 'starter', 'pro', 'enterprise'] as const satisfies readonly PlanId[]

export default async function Landing() {
  const { messages, locale } = await getDictionary()
  const L = messages.landing
  const nf = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'tr-TR')

  return (
    <>
      <section
        data-landing-conversion-zone
        className="relative overflow-hidden bg-[var(--color-hero)] text-white"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(47,91,255,0.22),transparent_55%)]"
        />

        <div className="relative mx-auto grid min-h-[calc(100dvh-64px)] max-w-6xl md:min-h-[720px] md:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] md:items-stretch">
          <div className="flex flex-col justify-center px-5 py-14 md:py-20 md:pr-8">
            <div className="filo-fade-up inline-flex items-center gap-3">
              <LogoMark className="size-9 text-white md:size-11" />
              <span className="text-[36px] font-semibold tracking-[-0.04em] md:text-[48px]">
                {BRAND_NAME}
              </span>
            </div>

            <h1 className="filo-fade-up-delay mt-6 max-w-md text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-white md:text-[34px]">
              {L.hero.titleBefore}{' '}
              <span className="text-[#9db8f5]">{L.hero.titleAccent}</span>
            </h1>

            <p className="filo-fade-up-delay mt-4 max-w-md text-[15px] leading-relaxed text-white/75">
              {L.hero.lead}
            </p>

            <div className="filo-fade-up-delay-2 mt-7 flex flex-wrap items-center gap-2.5">
              <Link
                href="/giris?mod=kayit"
                className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-accent px-4 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
              >
                {L.hero.ctaPrimary}
              </Link>
              <a
                href="#urun"
                className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-white/20 bg-white/5 px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
              >
                {L.hero.ctaSecondary}
              </a>
            </div>

            <p className="filo-fade-up-delay-2 mt-3 text-[11.5px] text-white/45">{L.hero.trust}</p>
          </div>

          <HeroPanel />
        </div>
      </section>

      <SocialProofStrip />

      <section id="kapasite" className="scroll-mt-16 border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
          <div className="mb-7 max-w-2xl">
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              {L.capacity.kicker}
            </p>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{L.capacity.title}</h2>
            <p className="mt-3 max-w-[40rem] text-[14px] leading-relaxed text-ink-muted">
              {L.capacity.lead}
            </p>
          </div>
          <CapacityCalculator />
        </div>
      </section>

      <ProblemSection />

      <section id="nasil" className="scroll-mt-16 border-b border-hairline bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {L.how.kicker}
          </p>
          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{L.how.title}</h2>
          <div className="mt-8 grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-3">
            {L.how.steps.map((step) => (
              <div key={step.n} className="bg-surface p-6">
                <span className="tabular font-mono text-[11.5px] text-accent">{step.n}</span>
                <h3 className="mt-3 text-[14.5px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductShowcase />

      <DayInOps />

      <section id="guvenlik" className="scroll-mt-16 border-b border-hairline bg-accent-soft/40">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
          <div className="max-w-2xl">
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              {L.safety.kicker}
            </p>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{L.safety.title}</h2>
            <p className="mt-3 max-w-[40rem] text-[14px] leading-relaxed text-ink-muted">
              {L.safety.lead}
            </p>
          </div>
          <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {L.safety.items.map((item) => (
              <div key={item.title} className="border-t border-hairline pt-4">
                <h3 className="text-[13.5px] font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{L.multi.title}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{L.multi.lead}</p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {L.multi.bullets.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px]">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="text-ink-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-hairline bg-surface p-6">
            <p className="text-[12px] font-medium text-ink-muted">{L.multi.chartTitle}</p>
            <div className="mt-4 flex flex-col gap-3.5">
              {[
                { sent: 250, tone: 'bg-accent' },
                { sent: 250, tone: 'bg-accent' },
                { sent: 120, tone: 'bg-warn' },
              ].map((line, index) => (
                <div key={L.multi.lines[index]!.name}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[12.5px]">{L.multi.lines[index]!.name}</span>
                    <span className="tabular text-[11.5px] text-ink-faint">{line.sent} / 250</span>
                  </div>
                  <div className="h-1.5 overflow-hidden bg-hairline">
                    <div
                      className={`h-full ${line.tone}`}
                      style={{ width: `${(line.sent / 250) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-hairline pt-4 text-[11.5px] text-ink-faint">
              {L.multi.chartNote}
            </p>
          </div>
        </div>
      </section>

      <WallOfLove />

      <section id="fiyatlar" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="max-w-2xl">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{L.pricing.title}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{L.pricing.lead}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_IDS.map((id) => {
              const quota = PLAN_QUOTAS[id]
              const featured = id === 'pro'
              return (
                <div
                  key={id}
                  className={`flex flex-col border bg-surface p-5 ${
                    featured ? 'border-accent/40' : 'border-hairline'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-[13.5px] font-semibold">{L.pricing.planLabels[id]}</h3>
                    {featured ? (
                      <span className="text-[10.5px] font-medium text-accent">
                        {L.pricing.recommended}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="tabular text-[24px] font-semibold leading-none">
                      {L.pricing.price[id]}
                    </span>
                    <span className="text-[12px] text-ink-faint">{L.pricing.note[id]}</span>
                  </div>

                  <div className="mt-4 border-y border-hairline py-3">
                    <p className="text-[13px] font-medium">
                      {L.pricing.accounts.replace('{n}', String(quota.accounts))}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-faint">{L.pricing.daily[id]}</p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {L.pricing.monthlyQuota.replace('{n}', nf.format(quota.messages))}
                    </p>
                  </div>

                  <ul className="mt-4 flex flex-1 flex-col gap-2">
                    {L.pricing.features[id].map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-[12.5px]">
                        <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-faint" />
                        <span className="text-ink-muted">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/giris?mod=kayit"
                    className={`mt-5 inline-flex h-9 items-center justify-center rounded-md text-[13px] font-medium transition-colors ${
                      featured
                        ? 'bg-accent text-accent-ink hover:bg-accent-dim'
                        : 'border border-hairline-strong bg-surface-raised hover:border-ink-faint'
                    }`}
                  >
                    {L.pricing.cta}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="sss" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">{L.faq.title}</h2>
          <div className="mt-7 flex flex-col">
            {L.faq.items.map((item) => (
              <details key={item.q} className="group border-b border-hairline">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[13.5px] font-medium transition-colors hover:text-accent">
                  {item.q}
                  <span className="shrink-0 text-ink-faint transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 pr-8 text-[13px] leading-relaxed text-ink-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
      <StickyCta />
      <LandingScrollTop />
    </>
  )
}
