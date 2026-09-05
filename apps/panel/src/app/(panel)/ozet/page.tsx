import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  Card,
  CardHeader,
  PageHeader,
  QuietLink,
  Stat,
} from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { SetupBanner } from '../setup-banner'

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

  const [setup, rest] = await Promise.all([
    getSetupProgress(supabase, org.id),
    Promise.all([
      supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
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
    ]),
  ])

  const [
    { count: accountsTotal },
    { count: lists },
    { count: campaignsRunning },
    { count: outToday },
    { count: inToday },
    { count: blacklist },
  ] = rest

  const { connectedCount, contactCount, validWa } = setup.counts
  const ready = setup.allDone

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
        title="Özet"
        description={`${org.name} · günün operasyon görünümü.`}
        action={
          ready ? (
            <AccentLink href="/hizli-gonderim">Mesaj gönder</AccentLink>
          ) : (
            <AccentLink href="/kurulum">Kurulumu tamamla</AccentLink>
          )
        }
      />

      <SetupBanner progress={setup} />

      <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-3.5">
            <Stat
              label="Bağlı hat"
              value={connectedCount}
              tone={connectedCount > 0 ? 'accent' : 'muted'}
            />
            <Link
              href="/hesaplar"
              className="mt-2 inline-block text-[12px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Hesaplar →
            </Link>
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat label="Kişiler" value={contactCount} tone="muted" />
            <p className="mt-1 text-[11px] text-ink-faint tabular">
              {validWa} WhatsApp’ta kayıtlı · {lists ?? 0} liste
            </p>
            <Link
              href="/kisiler"
              className="mt-2 inline-block text-[12px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Kişiler →
            </Link>
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat label="Bugün giden" value={outToday ?? 0} tone="accent" />
            <Link
              href="/gidenler"
              className="mt-2 inline-block text-[12px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Gidenler →
            </Link>
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat label="Bugün gelen" value={inToday ?? 0} tone="muted" />
            <Link
              href="/gelenler"
              className="mt-2 inline-block text-[12px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Gelenler →
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Kısayollar" subtitle="Sık kullanılan işler" />
          <ul className="divide-y divide-hairline">
            {shortcuts.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-3.5 py-2.5 transition-colors hover:bg-surface-raised"
                >
                  <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">{item.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Durum" subtitle="Canlı izleme" />
          <div className="space-y-2.5 p-3.5 text-[12.5px] text-ink-muted">
            <p>
              Çalışan kampanya:{' '}
              <span className="font-medium tabular text-ink">{campaignsRunning ?? 0}</span>
            </p>
            <p>
              Kara liste: <span className="font-medium tabular text-ink">{blacklist ?? 0}</span>
            </p>
            <p>
              Hat / toplam:{' '}
              <span className="font-medium tabular text-ink">
                {connectedCount} / {accountsTotal ?? 0}
              </span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
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
