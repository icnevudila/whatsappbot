import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccentLink, Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui'
import { DEFAULT_COLORS, FORMATS, type BrandColors, type FormatKey, type TemplateKey } from '@/lib/creative-templates'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { BrandStudio } from './brand-studio'

export const metadata: Metadata = { title: 'Marka kiti' }

const TEMPLATE_LABEL: Record<string, string> = {
  bold: 'Tam zemin',
  split: 'Bölünmüş',
  frame: 'Çerçeve',
  photo: 'AI arka plan',
}

const FORMAT_LABEL: Record<string, string> = {
  square: 'Kare',
  feed: 'Dikey',
  story: 'Hikaye',
}

export default async function BrandKitPage() {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const [{ data: kit }, { data: creatives }, { messages }] = await Promise.all([
    supabase
      .from('brand_kits')
      .select('id, name, colors, logo_path')
      .eq('org_id', org.id)
      .eq('is_default', true)
      .maybeSingle(),
    supabase
      .from('creatives')
      .select('id, public_url, template, format, created_at')
      .eq('org_id', org.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(8),
    getDictionary(),
  ])

  const t = createT(messages)
  const colors: BrandColors = {
    ...DEFAULT_COLORS,
    ...((kit?.colors as Partial<BrandColors> | null) ?? {}),
  }

  const hasSavedKit = Boolean(kit?.id)
  const creativeCount = creatives?.length ?? 0

  return (
    <div className="filo-fade-in">
      <PageHeader
        title={t('pages.markaTitle')}
        description="Renk ve logoyu bir kez kaydedin; kampanya görselleri aynı kimlikle üretilir. Hazır görseli Hızlı gönderime taşıyabilirsiniz."
        action={
          hasSavedKit ? (
            <Badge tone="accent">{kit?.name ?? 'Kayıtlı'}</Badge>
          ) : (
            <Badge>Henüz kaydedilmedi</Badge>
          )
        }
      />

      {!hasSavedKit ? (
        <div className="mb-4 rounded-[var(--radius-card)] border border-accent/30 bg-accent/8 px-3.5 py-2.5">
          <p className="text-[12.5px] leading-relaxed text-accent">
            İlk adım: renkleri seçin, isteğe bağlı logo ekleyin ve{' '}
            <span className="font-medium">Marka kitini kaydet</span> deyin. Sonra
            aşağıda kampanya görseli üretebilirsiniz.
          </p>
        </div>
      ) : null}

      <BrandStudio
        initialName={kit?.name ?? 'Varsayılan'}
        initialColors={colors}
        initialLogoUrl={kit?.logo_path ?? null}
        brandKitId={kit?.id ?? null}
        userId={userId}
        hasSavedKit={hasSavedKit}
      />

      <div className="mt-2.5">
        <Card>
          <CardHeader
            title="Üretilen görseller"
            subtitle={
              creativeCount > 0
                ? `${creativeCount} hazır · tıklayınca açılır`
                : 'Üretimden sonra burada listelenir'
            }
          />
          {creatives && creatives.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 p-3.5 sm:grid-cols-4">
              {creatives.map((creative) => {
                const templateKey = creative.template as TemplateKey
                const formatKey = creative.format as FormatKey
                const templateLabel =
                  TEMPLATE_LABEL[templateKey] ?? creative.template ?? 'Şablon'
                const formatLabel =
                  FORMAT_LABEL[formatKey] ?? FORMATS[formatKey]?.label ?? creative.format

                return (
                  <div
                    key={creative.id}
                    className="overflow-hidden rounded-md border border-hairline"
                  >
                    <a
                      href={creative.public_url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="block transition-opacity hover:opacity-90"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={creative.public_url ?? ''}
                        alt={`${templateLabel} · ${formatLabel}`}
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                    <div className="border-t border-hairline px-2 py-1.5">
                      <p className="truncate text-[11px] text-ink-faint">
                        {templateLabel} · {formatLabel}
                      </p>
                      {creative.public_url ? (
                        <Link
                          href={`/hizli-gonderim?media=${encodeURIComponent(creative.public_url)}`}
                          className="mt-1 block text-center text-[11.5px] font-medium text-accent hover:underline"
                        >
                          Gönderimde kullan
                        </Link>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="Henüz görsel yok"
              description="Stüdyoda başlık yazıp görsel üretin. Sonuç burada kalır; ardından Hızlı gönderime veya kampanyaya taşıyabilirsiniz."
              action={<AccentLink href="#kampanya-gorseli">Görsel üretmeye başla</AccentLink>}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
