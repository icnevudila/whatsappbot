'use client'
import { Button, QuietLink } from '@/components/ui'
export default function ApplicationError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-4 px-6 py-16"><p className="font-mono text-xs text-ink-muted">BAĞLANTIYI KONTROL EDELİM</p><h1 className="text-3xl font-semibold">Bu sayfayı yükleyemedik.</h1><p className="text-sm text-ink-muted">Bağlantınızı kontrol edip yeniden deneyin. Sorun devam ederse destek ekibine aşağıdaki hata kodunu iletin.</p>{error.digest && <p className="font-mono text-xs text-ink-muted">Hata kodu: {error.digest}</p>}<div className="flex gap-2"><Button variant="accent" onClick={retry}>Yeniden dene</Button><QuietLink href="/">Ana sayfa</QuietLink></div></main>
}
