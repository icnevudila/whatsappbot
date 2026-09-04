import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card, CardHeader, EmptyState, PageHeader } from '@/components/ui'
import { DEFAULT_COLORS, type BrandColors } from '@/lib/creative-templates'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BrandStudio } from './brand-studio'

export const metadata: Metadata = { title: 'Marka kiti' }

export default async function BrandKitPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const [{ data: kit }, { data: creatives }] = await Promise.all([
    supabase
      .from('brand_kits')
      .select('id, name, colors, logo_path')
      .eq('is_default', true)
      .maybeSingle(),
    supabase
      .from('creatives')
      .select('id, public_url, template, format, created_at')
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
        description="Renklerinizi ve logonuzu bir kez tanımlayın, kampanya görsellerini tek tıkla üretin."
      />

      <BrandStudio
        initialName={kit?.name ?? 'Varsayılan'}
        initialColors={colors}
        initialLogoUrl={kit?.logo_path ?? null}
        brandKitId={kit?.id ?? null}
        userId={user.id}
      />

      <div className="mt-4">
        <Card>
          <CardHeader
            title="Üretilen görseller"
            subtitle="Hızlı gönderim ve kampanya ekranlarında bu görselleri kullanabilirsiniz."
          />
          {creatives && creatives.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              {creatives.map((creative) => (
                <a
                  key={creative.id}
                  href={creative.public_url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-md border border-hairline transition-colors hover:border-hairline-strong"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={creative.public_url ?? ''}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </a>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz görsel yok"
              description="Yukarıdaki stüdyo ile bir kampanya görseli üretin; burada listelenir."
            />
          )}
        </Card>
      </div>
    </>
  )
}
