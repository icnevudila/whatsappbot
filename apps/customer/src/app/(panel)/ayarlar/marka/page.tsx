import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import { SettingsPageFrame } from '../settings-shell'
import { AddBrandKitButton } from './add-brand-kit-button'
import { BrandKitMoreMenu } from './brand-kit-menu'
import { OrgLogoCard } from './org-logo-card'
import { waAvatarColor, waAvatarLetters } from '@/lib/wa-avatar'

export const metadata: Metadata = { title: 'Marka kitleri' }
export const dynamic = 'force-dynamic'

function kitSwatches(colors: unknown) {
  const record =
    colors && typeof colors === 'object' && !Array.isArray(colors)
      ? (colors as Record<string, unknown>)
      : {}
  const pick = (key: keyof typeof DEFAULT_COLORS) => {
    const value = record[key]
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
      ? value.toLowerCase()
      : DEFAULT_COLORS[key]
  }
  return [pick('primary'), pick('accent'), pick('secondary')]
}

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
  const [{ data }, { data: orgRow }] = await Promise.all([
    supabase
      .from('brand_kits')
      .select('id, name, tone, colors, is_default, updated_at')
      .eq('org_id', org.id)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false }),
    supabase.from('organizations').select('logo_path').eq('id', org.id).maybeSingle(),
  ])

  const kits = data ?? []
  let logoPreview: string | null = null
  if (orgRow?.logo_path?.startsWith('http')) {
    logoPreview = orgRow.logo_path
  } else if (orgRow?.logo_path) {
    const { data: signed } = await supabase.storage
      .from('brand-assets')
      .createSignedUrl(orgRow.logo_path, 3600)
    logoPreview = signed?.signedUrl ?? null
  }

  return (
    <SettingsPageFrame
      wide
      title="Marka kitleri"
      description="Kampanya görselleri ve metin tonu için kitler."
      action={canManage ? <AddBrandKitButton /> : undefined}
    >
      <OrgLogoCard previewUrl={logoPreview} canEdit={canManage} />

      {kits.length === 0 ? (
        <EmptyState
          tone="generic"
          title="Henüz marka kiti yok"
          description="Renk, yazım tonu ve örnek görseli kaydedin. Kampanya AI’sı bunları kullanır."
          action={canManage ? <AddBrandKitButton label="İlk kiti oluştur" /> : undefined}
        />
      ) : (
        <ul className="wb-inbox-list">
          {kits.map((kit) => {
            const swatches = kitSwatches(kit.colors)
            return (
              <li key={kit.id}>
                <div className="flex min-w-0 items-center">
                  <Link href={`/ayarlar/marka/${kit.id}`} className="wb-wa-row min-w-0 flex-1 overflow-hidden">
                    <span
                      className="wb-wa-avatar"
                      style={{ background: waAvatarColor(kit.id) }}
                      aria-hidden
                    >
                      {waAvatarLetters(kit.name)}
                    </span>
                    <span className="wb-wa-row-main min-w-0">
                      <span className="wb-wa-row-top">
                        <span className="wb-wa-name">{kit.name}</span>
                        <span className="wb-wa-time flex items-center gap-1.5">
                          <span className="flex items-center" aria-hidden>
                            {swatches.map((color, index) => (
                              <span
                                key={`${kit.id}-${color}-${index}`}
                                className="inline-block size-3.5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(11,20,26,0.08)]"
                                style={{
                                  backgroundColor: color,
                                  marginLeft: index === 0 ? 0 : -6,
                                  zIndex: swatches.length - index,
                                }}
                              />
                            ))}
                          </span>
                          {kit.is_default ? <span>Varsayılan</span> : null}
                        </span>
                      </span>
                      <span className="wb-wa-row-bottom">
                        <span className="wb-wa-preview">{kit.tone || 'Ton yazılmamış'}</span>
                      </span>
                    </span>
                  </Link>
                  {canManage ? <BrandKitMoreMenu id={kit.id} name={kit.name} /> : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SettingsPageFrame>
  )
}
