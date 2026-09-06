import type { ReactNode } from 'react'

/** Dişçi landing’deki browser chrome — Filo ürün vitrini. */
export function ProductFrame({
  children,
  caption,
  url = 'app.filo.dev',
}: {
  children: ReactNode
  caption?: string
  url?: string
}) {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-[14px] border border-hairline bg-ink p-1.5 shadow-[0_28px_56px_-20px_rgba(15,23,42,0.35)] sm:p-2">
        <div className="mb-1.5 flex items-center gap-1.5 px-1" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 h-5 flex-1 rounded-md bg-white/10 px-2 font-mono text-[10px] leading-5 text-white/50">
            {url}
          </span>
        </div>
        <div className="overflow-hidden rounded-[10px] bg-canvas ring-1 ring-black/5">{children}</div>
      </div>
      {caption ? (
        <p className="mt-3 text-center text-[12.5px] font-medium text-ink-muted">{caption}</p>
      ) : null}
    </div>
  )
}
