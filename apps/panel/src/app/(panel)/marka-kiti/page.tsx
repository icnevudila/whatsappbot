import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardHeader, EmptyState, PageHeader } from '@/components/ui'
import { DEFAULT_COLORS, type BrandColors } from '@/lib/creative-templates'
import { requireActiveOrg } from '@/lib/org'
import { BrandStudio } from './brand-studio'

export const metadata: Metadata = { title: 'Marka kiti' }

export default async function BrandKitPage() {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const [{ data: kit }, { data: creatives }] = await Promise.all([
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
  ])

  const colors: BrandColors = {
    ...DEFAULT_COLORS,
    ...((kit?.colors as Partial<BrandColors> | null) ?? {}),
  }

  return (
    <>
      <PageHeader
        title="Marka kiti"
        description="Renklerinizi ve logonuzu bir kez tanımlayın, kampanya görsellerini tek tıkla üretin. Üretilen görseli Hızlı gönderime taşıyabilirsiniz."
      />

      <BrandStudio
        initialName={kit?.name ?? 'Varsayılan'}
        initialColors={colors}
        initialLogoUrl={kit?.logo_path ?? null}
        brandKitId={kit?.id ?? null}
        userId={userId}
      />

      <div className="mt-4">
        <Card>
          <CardHeader
            title="Üretilen görseller"
            subtitle="Bir görsele tıklayınca açılır; “Gönderimde kullan” Hızlı gönderime taşır."
          />
          {creatives && creatives.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              {creatives.map((creative) => (
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
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                  {creative.public_url ? (
                    <Link
                      href={`/hizli-gonderim?media=${encodeURIComponent(creative.public_url)}`}
                      className="block border-t border-hairline px-2 py-1.5 text-center text-[11.5px] font-medium text-accent hover:bg-surface-raised"
                    >
                      Gönderimde kullan
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz görsel yok"
              description="Yukarıdaki stüdyoda başlık ve metin girip görsel üretin. Sonuç burada listelenir; ardından Hızlı gönderime taşıyabilirsiniz."
            />
          )}
        </Card>
      </div>
    </>
  )
}
