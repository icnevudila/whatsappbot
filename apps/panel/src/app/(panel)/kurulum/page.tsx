import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, PageHeader } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Kurulum' }

/**
 * Adimlar kullanicinin isaretlemesiyle degil, gercek veriyle tamamlaniyor.
 * "Tamamlandi" kutucugu tiklanabilir olsaydi, hicbir hat bagli olmadan
 * kurulumu bitirmis gorunmek mumkun olurdu.
 */
export default async function SetupPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const [{ count: connectedCount }, { count: contactCount }, { count: campaignCount }] =
    await Promise.all([
      supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'connected'),
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }),
    ])

  const hasLine = (connectedCount ?? 0) > 0
  const hasContacts = (contactCount ?? 0) > 0
  const hasCampaign = (campaignCount ?? 0) > 0

  const steps = [
    {
      done: hasLine,
      title: 'Bir WhatsApp hatti baglayin',
      body: hasLine
        ? `${connectedCount} hat bagli. Daha fazla hat eklemek gunluk kapasitenizi artirir.`
        : 'Hesaplar sekmesinde hat olusturun, QR kodu telefonunuzdan okutun. Baglanti sunucuda kalir; bilgisayarinizi kapatabilirsiniz.',
      href: '/hesaplar',
      cta: hasLine ? 'Hat ekle' : 'Hat bagla',
    },
    {
      done: hasContacts,
      title: 'Numaralarinizi ekleyin',
      body: hasContacts
        ? `${contactCount} kisi kayitli.`
        : 'CSV yukleyin ya da numaralari dogrudan yapistirin. Hepsi otomatik olarak uluslararasi formata cevrilir ve WhatsApp kaydi dogrulanir.',
      href: '/kisiler',
      cta: hasContacts ? 'Listeleri gor' : 'Kisi ekle',
    },
    {
      done: hasCampaign,
      title: 'Ilk gonderiminizi yapin',
      body: hasCampaign
        ? 'Kampanyalarinizi genel durum ekranindan canli takip edebilirsiniz.'
        : 'Hizli gonderim ekraninda numaralari yapistirip mesaji yazmaniz yeterli. Gonderim hizi otomatik olarak hattinizi koruyacak sekilde ayarlanir.',
      href: '/hizli-gonderim',
      cta: hasCampaign ? 'Yeni gonderim' : 'Gonderime basla',
    },
  ]

  const completed = steps.filter((step) => step.done).length

  return (
    <>
      <PageHeader
        title="Kurulum"
        description="Uc adim. Her biri tamamlandiginda burada otomatik olarak isaretlenir."
        action={
          <span className="tabular text-[12.5px] text-ink-muted">
            {completed} / {steps.length} tamam
          </span>
        }
      />

      <div className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <div className="flex items-start gap-4 p-4">
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11.5px] font-medium ${
                  step.done
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-hairline-strong text-ink-faint'
                }`}
              >
                {step.done ? '✓' : index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="text-[13.5px] font-semibold">{step.title}</h2>
                <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </div>

              <Link
                href={step.href}
                className={`inline-flex h-8 shrink-0 items-center rounded-md px-3 text-[12.5px] font-medium transition-colors ${
                  step.done
                    ? 'border border-hairline-strong bg-surface-raised hover:border-ink-faint'
                    : 'bg-accent text-accent-ink hover:bg-accent-dim'
                }`}
              >
                {step.cta}
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {completed === steps.length ? (
        <div className="mt-4 rounded-md border border-accent/30 bg-accent/8 px-3.5 py-3">
          <p className="text-[12.5px] text-accent">
            Kurulum tamam. Bundan sonra gunluk isinizi{' '}
            <Link href="/durum" className="underline underline-offset-2">
              genel durum
            </Link>{' '}
            ekranindan takip edebilirsiniz.
          </p>
        </div>
      ) : null}
    </>
  )
}
