import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccentLink, Card, Meter, PageHeader, QuietLink } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'

export const metadata: Metadata = { title: 'Kurulum' }
export const dynamic = 'force-dynamic'

/**
 * Gerçek veriye dayalı 5 adım — layout showSetup ile aynı kriterler.
 */
export default async function SetupPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const { counts, allDone, doneCount } = await getSetupProgress(supabase, org.id)
  const { brandCount, contactCount, connectedCount, validWa, outCount } = counts

  const steps = [
    {
      done: brandCount > 0,
      title: 'Marka',
      body:
        brandCount > 0
          ? 'Marka kiti hazır. Renk ve logo kampanya önizlemesinde kullanılır.'
          : 'Gönderimlerde görünecek ad, renk ve logo.',
      href: '/marka-kiti',
      cta: brandCount > 0 ? 'Markayı düzenle' : 'Marka kitini aç',
    },
    {
      done: contactCount > 0,
      title: 'Kişi listesi',
      body: contactCount > 0 ? `${contactCount} kişi defterde.` : 'CSV veya yapıştırarak numaraları içeri al.',
      href: '/kisiler#liste-olustur',
      cta: contactCount > 0 ? 'Listeleri gör' : 'Liste oluştur',
    },
    {
      done: connectedCount > 0,
      title: 'WhatsApp hattı',
      body:
        connectedCount > 0
          ? `${connectedCount} hat bağlı.`
          : 'QR veya telefon koduyla hattı bağla.',
      href: '/hesaplar',
      cta: connectedCount > 0 ? 'Hat ekle' : 'Hat bağla',
    },
    {
      done: validWa > 0,
      title: 'Numara kontrolü',
      body:
        validWa > 0
          ? `${validWa} numara WhatsApp’ta kayıtlı.`
          : 'Tek numara veya tüm defter — WhatsApp’ta kayıtlı mı?',
      href: '/kisiler',
      cta: 'Kontrol et',
    },
    {
      done: outCount > 0,
      title: 'İlk mesaj',
      body:
        outCount > 0
          ? 'En az bir giden mesaj kaydı var.'
          : 'Hızlı gönderimle test mesajı at.',
      href: '/hizli-gonderim',
      cta: outCount > 0 ? 'Yeni gönderim' : 'İlk mesajı gönder',
    },
  ]

  return (
    <>
      <PageHeader
        title="Kurulum"
        description="Beş adım. Veri oluştukça burada otomatik işaretlenir."
        action={
          <span className="tabular text-[12.5px] text-ink-muted">
            {doneCount} / {steps.length}
          </span>
        }
      />

      <div className="mb-4">
        <Meter value={doneCount} max={steps.length} />
      </div>

      <div className="flex flex-col gap-2.5">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <div className="flex items-start gap-2.5 p-3.5">
              <span
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  step.done ? 'bg-ok text-white' : 'bg-surface-raised text-ink-muted'
                }`}
              >
                {step.done ? '✓' : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[13.5px] font-semibold text-ink">{step.title}</h2>
                <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </div>
              {step.done ? (
                <QuietLink href={step.href} className="shrink-0 text-[12.5px]">
                  {step.cta}
                </QuietLink>
              ) : (
                <AccentLink href={step.href} className="shrink-0 text-[12.5px]">
                  {step.cta}
                </AccentLink>
              )}
            </div>
          </Card>
        ))}
      </div>

      {allDone ? (
        <div className="mt-2.5 rounded-[var(--radius-card)] border border-ok/30 bg-ok-soft px-3.5 py-2.5">
          <p className="text-[13px] font-medium text-ok-dim">Hazırsın</p>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            <Link href="/ozet" className="font-medium text-accent underline-offset-2 hover:underline">
              Özet
            </Link>
            {' · '}
            <Link href="/durum" className="font-medium text-accent underline-offset-2 hover:underline">
              Durum
            </Link>{' '}
            ekranından devam edin.
          </p>
        </div>
      ) : null}
    </>
  )
}
