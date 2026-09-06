'use client'

import { LandingVideo } from './landing/landing-video'

/**
 * Hero ürün düzlemi: dişçi landing gibi kenara yapışık, içinde demo video.
 */
export function HeroPanel() {
  return (
    <div className="filo-fade-up-delay-2 relative flex h-full flex-col border-t border-white/10 md:border-l md:border-t-0">
      <div className="relative flex flex-1 flex-col overflow-hidden bg-ink p-2 sm:p-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 px-1" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 h-5 flex-1 rounded-md bg-white/10 px-2 font-mono text-[10px] leading-5 text-white/45">
            app.filo.dev
          </span>
        </div>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[10px] bg-canvas ring-1 ring-black/5 md:aspect-auto md:min-h-0 md:flex-1">
          <LandingVideo
            src="/landing/demo.mp4"
            poster="/landing/ozet.png"
            label="Filo panel demo videosu"
            className="object-center md:object-top"
          />
        </div>
      </div>
      <p className="border-t border-white/10 bg-[var(--color-hero)] px-4 py-2.5 text-center text-[12px] font-medium text-white/55">
        Canlı panel turu — özet, hatlar, gönderim
      </p>
    </div>
  )
}
