'use client'

import { LandingVideo } from './landing/landing-video'

/**
 * Dişçi hero ile aynı dil: yuvarlatılmış browser chrome + sabit 16:10 video.
 * Açık hero üzerinde koyu chrome — ürün paneli net okunur.
 */
export function HeroPanel({ caption }: { caption: string }) {
  return (
    <div className="mx-auto w-full max-w-xl lg:max-w-none">
      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-ink p-1.5 shadow-[0_28px_56px_-20px_rgba(15,23,42,0.28)] sm:p-2">
        <div className="mb-1.5 flex items-center gap-1.5 px-1" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 h-5 min-w-0 flex-1 rounded-md bg-white/10 px-2 font-mono text-[10px] leading-5 text-white/45">
            app.filo.dev
          </span>
        </div>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[10px] bg-canvas ring-1 ring-black/5">
          <LandingVideo
            src="/landing/demo.mp4"
            poster="/landing/ozet.png"
            label={caption}
            className="object-cover object-top"
          />
        </div>
      </div>
      <p className="mt-3 text-center text-[12.5px] font-medium text-ink-muted">{caption}</p>
    </div>
  )
}
