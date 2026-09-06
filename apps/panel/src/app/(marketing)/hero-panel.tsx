'use client'

import { LandingVideo } from './landing/landing-video'

/**
 * Hero sağ sütun: kenara yapışık, yüksekliği dolduran video düzlemi.
 */
export function HeroPanel() {
  return (
    <div className="filo-fade-in relative h-full min-h-[300px] w-full border-t border-white/10 md:min-h-full md:border-l md:border-t-0">
      <div className="absolute inset-0 overflow-hidden bg-[#07090f]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 bg-gradient-to-b from-black/55 to-transparent px-3 pb-8 pt-3"
          aria-hidden
        >
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 h-5 min-w-0 flex-1 rounded-md bg-white/10 px-2 font-mono text-[10px] leading-5 text-white/50">
            app.filo.dev
          </span>
        </div>

        <LandingVideo
          src="/landing/demo.mp4"
          poster="/landing/ozet.png"
          label="Filo panel demo videosu"
          className="object-cover object-top"
        />
      </div>
    </div>
  )
}
