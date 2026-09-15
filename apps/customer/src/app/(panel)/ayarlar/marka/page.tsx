import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { SettingsPageFrame } from '../settings-shell'
import { DeleteBrandKitButton } from './delete-button'
import { waAvatarColor, waAvatarLetters } from '@/lib/wa-avatar'

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
      action={
        canManage ? (
          <Link href="/ayarlar/marka/yeni" className="wb-wa-text-btn">
            Kit ekle
          </Link>
        ) : undefined
      }
    >
      {kits.length === 0 ? (
        <EmptyState
          tone="generic"
          title="Henüz marka kiti yok"
          description="Renk, logo ve yazım tonunu kaydedin. Kampanya AI’sı bunları kullanır."
          action={
            canManage ? (
              <Link href="/ayarlar/marka/yeni" className="wb-wa-text-btn">
                İlk kiti oluştur
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="wb-inbox-list">
          {kits.map((kit) => (
            <li key={kit.id}>
              <div className="flex items-center">
                <Link href={`/ayarlar/marka/${kit.id}`} className="wb-wa-row min-w-0 flex-1">
                  <span
                    className="wb-wa-avatar"
                    style={{ background: waAvatarColor(kit.id) }}
                    aria-hidden
                  >
                    {waAvatarLetters(kit.name)}
                  </span>
                  <span className="wb-wa-row-main">
                    <span className="wb-wa-row-top">
                      <span className="wb-wa-name">{kit.name}</span>
                      {kit.is_default ? <span className="wb-wa-time">Varsayılan</span> : null}
                    </span>
                    <span className="wb-wa-row-bottom">
                      <span className="wb-wa-preview">{kit.tone || 'Ton yazılmamış'}</span>
                    </span>
                  </span>
                </Link>
                {canManage ? (
                  <div className="pr-1">
                    <DeleteBrandKitButton id={kit.id} name={kit.name} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsPageFrame>
  )
}
