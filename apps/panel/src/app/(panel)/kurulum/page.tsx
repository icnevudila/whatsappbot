import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccentLink, Card, PageHeader, QuietLink } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Kurulum' }

/**
 * Adımlar kullanıcının işaretlemesiyle değil, gerçek veriyle tamamlanıyor.
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
      title: 'Bir WhatsApp hattı bağlayın',
      body: hasLine
        ? `${connectedCount} hat bağlı. Daha fazla hat eklemek günlük kapasitenizi artırır.`
        : 'Hesaplar’da hat oluşturun. QR okutun veya telefonla 8 haneli kod alın. Bağlantı sunucuda kalır; paneli kapatabilirsiniz.',
      href: '/hesaplar',
      cta: hasLine ? 'Hat ekle' : 'Hat bağla',
    },
    {
      done: hasContacts || hasCampaign,
      title: 'Numaralarınızı ekleyin',
      body: hasContacts
        ? `${contactCount} kişi kayıtlı. Tek seferlik gönderim için Hızlı gönderim de yeterli.`
        : 'CSV yükleyin, yapıştırın veya Hızlı gönderim ile doğrudan numaraları girin. WhatsApp kaydı gönderim öncesi kontrol edilir.',
      href: hasContacts ? '/kisiler' : '/hizli-gonderim',
      cta: hasContacts ? 'Listeleri gör' : 'Hızlı gönderime git',
    },
    {
      done: hasCampaign,
      title: 'İlk gönderiminizi yapın',
      body: hasCampaign
        ? 'Kampanyalarınızı Durum ekranından canlı takip edebilirsiniz.'
        : 'Hızlı gönderimde numaraları yapıştırıp mesajı yazmanız yeterli. Hız otomatik olarak hattınızı koruyacak şekilde ayarlanır.',
      href: '/hizli-gonderim',
      cta: hasCampaign ? 'Yeni gönderim' : 'Gönderime başla',
    },
  ]

  const completed = steps.filter((step) => step.done).length

  return (
    <>
      <PageHeader
        title="Kurulum"
        description="Üç adım. Her biri tamamlandığında burada otomatik işaretlenir."
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

      {completed === steps.length ? (
        <div className="mt-4 rounded-md border border-accent/30 bg-accent/8 px-3.5 py-3">
          <p className="text-[12.5px] text-accent">
            Kurulum tamam. Günlük işinizi{' '}
            <Link href="/durum" className="underline underline-offset-2">
              Durum
            </Link>{' '}
            ekranından izleyebilirsiniz.
          </p>
        </div>
      ) : null}
    </>
  )
}
