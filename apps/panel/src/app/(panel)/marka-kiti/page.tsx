import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui'
import { DEFAULT_COLORS, type BrandColors } from '@/lib/creative-templates'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { BrandStudio } from './brand-studio'
import { CreativeGallery } from './creative-gallery'

export const metadata: Metadata = { title: 'Marka kiti' }

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
  const canManage = isOrgAdminRole(org.role)

  return (
    <div className="filo-fade-in">
      <PageHeader
        title={t('pages.markaTitle')}
        description={
          canManage
            ? 'Renk ve logoyu bir kez kaydedin; kampanya görselleri aynı kimlikle üretilir. Hazır görseli Hızlı gönderime taşıyabilirsiniz.'
            : 'Marka kitini görüntüleyebilirsiniz. Kaydetme ve silme için sahip veya yönetici olmanız gerekir.'
        }
        action={
          hasSavedKit ? (
            <Badge tone="accent">{kit?.name ?? 'Kayıtlı'}</Badge>
          ) : (
            <Badge>Henüz kaydedilmedi</Badge>
          )
        }
      />

      {!hasSavedKit && canManage ? (
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
        orgId={org.id}
        hasSavedKit={hasSavedKit}
        canEdit={canManage}
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
            <CreativeGallery creatives={creatives} canDelete={canManage} />
          ) : (
            <EmptyState
              tone="brand"
              title="Henüz görsel yok"
              description={
                canManage
                  ? 'Stüdyoda başlık yazıp görsel üretin. Sonuç burada kalır; ardından Hızlı gönderime veya kampanyaya taşıyabilirsiniz.'
                  : 'Henüz üretilmiş görsel yok. Yönetici marka kitinden üretim yapabilir.'
              }
              action={
                canManage ? (
                  <AccentLink href="#kampanya-gorseli">Görsel üretmeye başla</AccentLink>
                ) : undefined
              }
            />
          )}
        </Card>
      </div>
    </div>
  )
}
