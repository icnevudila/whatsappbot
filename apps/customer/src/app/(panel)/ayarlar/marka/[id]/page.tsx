import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Card, CardHeader, Notice } from '@/components/ui'
import { DEFAULT_COLORS, type BrandColors } from '@/lib/creative-templates'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { SettingsPageFrame } from '../../settings-shell'
import { BrandKitForm } from '../brand-kit-form'
import { DeleteBrandKitButton } from '../delete-button'

export const metadata: Metadata = { title: 'Marka kiti' }
export const dynamic = 'force-dynamic'

export default async function BrandKitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const { data: kit } = await supabase
    .from('brand_kits')
    .select('id, name, colors, tone, logo_path, is_default')
    .eq('org_id', org.id)
    .eq('id', id)
    .maybeSingle()

  if (!kit) notFound()

  const canManage = isOrgAdminRole(org.role)
  const colors: BrandColors = {
    ...DEFAULT_COLORS,
    ...((kit.colors as Partial<BrandColors> | null) ?? {}),
  }

  let logoPreview: string | null = null
  if (kit.logo_path?.startsWith('http')) {
    logoPreview = kit.logo_path
  } else if (kit.logo_path) {
    const { data } = await supabase.storage
      .from('brand-assets')
      .createSignedUrl(kit.logo_path, 3600)
    logoPreview = data?.signedUrl ?? null
  }

  return (
    <SettingsPageFrame
      title={kit.name}
      description="Kit ayrıntıları"
      action={canManage ? <DeleteBrandKitButton id={kit.id} name={kit.name} /> : undefined}
    >
      {!canManage ? (
        <Notice tone="warn">Görüntülüyorsunuz. Düzenleme için yönetici gerekir.</Notice>
      ) : null}
      <Card>
        <CardHeader title="Düzenle" subtitle={kit.is_default ? 'Varsayılan kit' : undefined} />
        <BrandKitForm
          canEdit={canManage}
          kit={{
            id: kit.id,
            name: kit.name,
            tone: kit.tone ?? '',
            logoPreview,
            isDefault: kit.is_default,
            colors,
          }}
        />
      </Card>
    </SettingsPageFrame>
  )
}
