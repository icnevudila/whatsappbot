import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccentLink, Badge, Card, EmptyState } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { SettingsPageFrame } from '../settings-shell'
import { DeleteBrandKitButton } from './delete-button'

export const metadata: Metadata = { title: 'Marka kitleri' }
export const dynamic = 'force-dynamic'

export default async function BrandKitsPage() {
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

  const canManage = isOrgAdminRole(org.role)
  const { data } = await supabase
    .from('brand_kits')
    .select('id, name, tone, is_default, updated_at')
    .eq('org_id', org.id)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })

  const kits = data ?? []

  return (
    <SettingsPageFrame
      wide
      title="Marka kitleri"
      description="Kampanya görselleri ve metin tonu için kitler."
      action={canManage ? <AccentLink href="/ayarlar/marka/yeni">Kit ekle</AccentLink> : undefined}
    >
      {kits.length === 0 ? (
        <Card>
          <EmptyState
            tone="generic"
            title="Henüz marka kiti yok"
            description="Renk, logo ve yazım tonunu kaydedin. Kampanya AI’sı bunları kullanır."
            action={canManage ? <AccentLink href="/ayarlar/marka/yeni">İlk kiti oluştur</AccentLink> : undefined}
          />
        </Card>
      ) : (
        <ul className="divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline bg-surface">
          {kits.map((kit) => (
            <li key={kit.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <Link
                  href={`/ayarlar/marka/${kit.id}`}
                  className="font-semibold text-ink underline-offset-2 hover:underline"
                >
                  {kit.name}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-muted">
                  {kit.tone || 'Ton yazılmamış'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {kit.is_default ? <Badge tone="accent">Varsayılan</Badge> : null}
                <AccentLink href={`/ayarlar/marka/${kit.id}`} className="h-8 text-[12.5px]">
                  Görüntüle
                </AccentLink>
                {canManage ? <DeleteBrandKitButton id={kit.id} name={kit.name} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsPageFrame>
  )
}
