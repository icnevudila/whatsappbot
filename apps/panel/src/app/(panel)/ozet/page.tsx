import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  Card,
  CardHeader,
  Meter,
  PageHeader,
  QuietLink,
  Stat,
} from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'

export const metadata: Metadata = { title: 'Özet' }
export const dynamic = 'force-dynamic'

export default async function PanelHomePage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const since = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

  const [
    { count: connected },
    { count: accountsTotal },
    { count: contacts },
    { count: lists },
    { count: campaignsRunning },
    { count: outToday },
    { count: inToday },
    { count: blacklist },
    { count: brandKits },
    { count: waValid },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('status', 'connected'),
    supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
    supabase
      .from('contact_lists')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .neq('source', 'quick_send'),
    supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('status', 'running'),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('direction', 'out')
      .gte('created_at', since),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('direction', 'in')
      .gte('created_at', since),
    supabase.from('blacklist').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
    supabase.from('brand_kits').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('wa_status', 'valid'),
  ])

  const setupBits = [
    (connected ?? 0) > 0,
    (contacts ?? 0) > 0,
    (brandKits ?? 0) > 0,
    (outToday ?? 0) > 0 || (campaignsRunning ?? 0) > 0,
  ]
  const setupDone = setupBits.filter(Boolean).length
  const ready = setupDone === setupBits.length

  const shortcuts = [
    {
      href: '/hizli-gonderim',
      title: 'Hızlı gönderim',
      body: 'Tek seferlik mesaj — liste şart değil.',
    },
    {
      href: '/kampanyalar',
      title: 'Kampanyalar',
      body: 'Liste + hatlarla toplu gönderim.',
    },
    {
      href: '/gelenler',
      title: 'Gelenler',
      body: 'Yanıtları ve çıkış isteklerini izleyin.',
    },
    {
      href: '/gidenler',
      title: 'Gidenler',
      body: 'Bugün giden mesaj kaydı.',
    },
  ]

  return (
    <>
      <PageHeader
        title={org.name}
        description="Günlük özet. Soldaki menüden hesaplar, gönderim ve izleme ekranlarına geçin."
        action={
          ready ? (
            <AccentLink href="/hizli-gonderim">Mesaj gönder</AccentLink>
          ) : (
            <AccentLink href="/kurulum">Kurulumu tamamla</AccentLink>
          )
        }
      />

      {!ready ? (
        <Card className="mb-4">
          <div className="space-y-3 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-ink">Yayına hazırlık</p>
              <span className="tabular text-[12px] text-ink-muted">
                {setupDone}/{setupBits.length}
              </span>
            </div>
            <Meter value={setupDone} max={setupBits.length} />
            <p className="text-[12.5px] text-ink-muted">
              Hat, kişi, marka ve ilk gönderim —{' '}
              <Link href="/kurulum" className="font-medium text-accent underline-offset-2 hover:underline">
                Kurulum
              </Link>{' '}
              adımlarını bitirince burası yeşile döner.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-4">
            <Stat label="Bağlı hat" value={connected ?? 0} tone={(connected ?? 0) > 0 ? 'accent' : 'muted'} />
            <QuietLink href="/hesaplar" className="mt-2 inline-block text-[11.5px]">
              Hesaplar
            </QuietLink>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <Stat label="Kişiler" value={contacts ?? 0} tone="muted" />
            <p className="mt-1 text-[11px] text-ink-faint tabular">
              {waValid ?? 0} WA ✓ · {lists ?? 0} liste
            </p>
            <QuietLink href="/kisiler" className="mt-2 inline-block text-[11.5px]">
              Kişiler
            </QuietLink>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <Stat label="Bugün giden" value={outToday ?? 0} tone="accent" />
            <QuietLink href="/gidenler" className="mt-2 inline-block text-[11.5px]">
              Gidenler
            </QuietLink>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <Stat label="Bugün gelen" value={inToday ?? 0} tone="muted" />
            <QuietLink href="/gelenler" className="mt-2 inline-block text-[11.5px]">
              Gelenler
            </QuietLink>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Kısayollar" subtitle="Sık kullanılan işler" />
          <ul className="divide-y divide-hairline">
            {shortcuts.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-4 py-3 transition-colors hover:bg-surface-raised"
                >
                  <p className="text-[13px] font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">{item.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Durum" subtitle="Canlı izleme" />
          <div className="space-y-3 p-4 text-[12.5px] text-ink-muted">
            <p>
              Çalışan kampanya:{' '}
              <span className="font-medium tabular text-ink">{campaignsRunning ?? 0}</span>
            </p>
            <p>
              Kara liste:{' '}
              <span className="font-medium tabular text-ink">{blacklist ?? 0}</span>
            </p>
            <p>
              Hat / toplam:{' '}
              <span className="font-medium tabular text-ink">
                {connected ?? 0} / {accountsTotal ?? 0}
              </span>
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <AccentLink href="/durum">Durum paneli</AccentLink>
              <QuietLink href="/kampanyalar">Kampanyalar</QuietLink>
              <QuietLink href="/kara-liste">Kara liste</QuietLink>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
