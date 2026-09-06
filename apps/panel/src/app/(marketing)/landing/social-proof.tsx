import { ScrollReveal } from './scroll-reveal'

const HIGHLIGHTS = [
  { label: 'Hat başına günlük tavan', detail: 'WhatsApp kotasına sadık' },
  { label: 'Sunucuda oturum', detail: 'Panel kapalıyken de bağlı' },
  { label: 'Numara doğrulama', detail: 'Kayıtsıza deneme yok' },
  { label: '7 gün deneme', detail: 'Kredi kartı istemez' },
] as const

export function SocialProofStrip() {
  return (
    <section className="border-b border-hairline bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <ScrollReveal>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {HIGHLIGHTS.map((item) => (
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
