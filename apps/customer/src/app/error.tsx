'use client'

import { Button, QuietLink } from '@/components/ui'
import { Icon } from '@/components/icon'

export default function ApplicationError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <main className="wb-wa-page mx-auto flex min-h-[60vh] w-full max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-[var(--radius-card)] border border-accent/25 bg-accent-soft/50 px-5 py-7 shadow-[var(--shadow-card)] sm:px-7">
        <div className="mb-4 flex size-11 items-center justify-center rounded-full border border-accent/30 bg-surface text-accent">
          <Icon name="refresh" className="size-5" />
        </div>

        <p className="text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">
          Bağlantıyı kontrol edelim
        </p>
        <h1 className="mt-1.5 text-[24px] font-bold tracking-[-0.02em] text-ink sm:text-[28px]">
          Bu sayfayı yükleyemedik.
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
          Bağlantınızı kontrol edip yeniden deneyin. Sorun devam ederse destek ekibine aşağıdaki
          hata kodunu iletin.
        </p>

        {error.digest ? (
          <p className="mt-3 rounded-md border border-hairline bg-surface px-3 py-2 font-mono text-[12px] text-ink-muted">
            Hata kodu: {error.digest}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="accent"
            onClick={retry}
            className="!rounded-full !border-0 !bg-[#00a884] !text-white !shadow-none hover:!bg-[#008069]"
          >
            Yeniden dene
          </Button>
          <QuietLink href="/" className="!rounded-full">
            Ana sayfa
          </QuietLink>
        </div>
      </div>
    </main>
  )
}
