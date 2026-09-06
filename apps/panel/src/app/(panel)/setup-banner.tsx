import Link from 'next/link'
import { AccentLink, Card, Meter } from '@/components/ui'
import type { getSetupProgress } from '@/lib/setup-progress'

type Progress = Awaited<ReturnType<typeof getSetupProgress>>

const STEP_COPY: { key: keyof Progress['steps']; label: string; href: string }[] = [
  { key: 'brand', label: 'Marka', href: '/kurulum' },
  { key: 'contacts', label: 'Kişi listesi', href: '/kurulum' },
  { key: 'connected', label: 'WhatsApp hattı', href: '/hesaplar' },
  { key: 'verified', label: 'Numara kontrolü', href: '/kisiler' },
]

/**
 * Kurulum bitmeden gösterilen şerit — zorunlu wizard’a yönlendirir.
 */
export function SetupBanner({ progress }: { progress: Progress }) {
  if (progress.allDone) return null

  return (
    <Card className="mb-4">
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-ink">Kurulumu tamamla</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              Dört zorunlu adım · bitmeden kampanya açılamaz
            </p>
          </div>
          <span className="tabular text-[12px] text-ink-muted">
            {progress.doneCount}/{STEP_COPY.length}
          </span>
        </div>

        <Meter value={progress.doneCount} max={STEP_COPY.length} />

        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {STEP_COPY.map((step, index) => {
            const done = progress.steps[step.key]
            return (
              <li key={step.key} className="flex items-center gap-1.5 text-[12.5px]">
                <span
                  className={`grid size-4 shrink-0 place-items-center rounded-full border text-[9px] ${
                    done
                      ? 'border-accent/40 bg-accent/15 text-accent'
                      : 'border-hairline-strong text-ink-faint'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                {done ? (
                  <span className="text-ink-faint line-through">{step.label}</span>
                ) : (
                  <Link
                    href={step.href}
                    className="text-ink-muted underline decoration-hairline-strong underline-offset-2 hover:text-ink"
                  >
                    {step.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>

        <div>
          <AccentLink href="/kurulum">Kuruluma devam et</AccentLink>
        </div>
      </div>
    </Card>
  )
}
