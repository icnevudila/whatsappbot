import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui'
import { DEFAULT_COLORS, type BrandColors } from '@/lib/creative-templates'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { BrandStudio } from './brand-studio'
import { CreativeGallery } from './creative-gallery'

export const metadata: Metadata = { title: 'Marka' }

export default async function BrandKitPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const [{ data: kit }, { data: creatives }, { messages }] = await Promise.all([
    supabase
      .from('brand_kits')
      .select('id, name, colors, logo_path, tone')
      .eq('org_id', org.id)
      .eq('is_default', true)
      .maybeSingle(),
    supabase
      .from('creatives')
      .select('id, public_url, template, format, created_at')
      .eq('org_id', org.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(16),
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
            ? t('pages.markaDesc')
            : 'Marka kimliğini görüntüleyebilirsiniz. Düzenleme için yönetici gerekir.'
        }
        action={
          hasSavedKit ? (
            <Badge tone="accent">{kit?.name ?? 'Kayıtlı'}</Badge>
          ) : (
            <Badge>Kayıt yok</Badge>
          )
        }
      />

      <BrandStudio
        initialName={kit?.name ?? org.name}
        initialColors={colors}
        initialLogoUrl={kit?.logo_path ?? null}
        initialTone={kit?.tone ?? ''}
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
                : 'Stüdyodan üretilen PNG’ler burada listelenir'
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
                  ? 'Yukarıdaki stüdyoda başlık yazıp üretin. Sonuç burada kalır.'
                  : 'Henüz üretilmiş görsel yok.'
              }
              action={
                canManage ? (
                  <AccentLink href="#kampanya-gorseli">Stüdyoya git</AccentLink>
                ) : undefined
              }
            />
          )}
        </Card>
      </div>
    </div>
  )
}
