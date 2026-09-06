import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  Card,
  CardHeader,
  PageHeader,
  QuietLink,
  StatusPill,
} from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { SetupBanner } from '../setup-banner'

export const metadata: Metadata = { title: 'Özet' }
export const dynamic = 'force-dynamic'

/** Tek büyük sonraki adım — kullanıcı düşünmesin. */
function NextStepHero({
  href,
  title,
  body,
  cta,
}: {
  href: string
  title: string
  body: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="wb-card-lift mb-3 block rounded-[var(--radius-md)] border border-accent/40 bg-accent-soft/70 p-5 shadow-[inset_4px_0_0_var(--color-accent)] transition-colors hover:bg-accent-soft"
    >
      <p className="text-[11.5px] font-semibold tracking-wide text-accent uppercase">
        Şimdi yap
      </p>
      <h2 className="mt-1.5 text-[22px] font-extrabold tracking-[-0.03em] text-ink sm:text-[26px]">
        {title}
      </h2>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-muted">{body}</p>
      <span className="mt-4 inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-[14px] font-bold text-white">
        {cta} →
      </span>
    </Link>
  )
}

function MiniStep({
  href,
  n,
  title,
  done,
  body,
}: {
  href: string
  n: number
  title: string
  done: boolean
  body: string
}) {
  return (
    <Link
      href={href}
      className={`flex gap-3 rounded-[var(--radius-md)] border p-3.5 transition-colors ${
        done
          ? 'border-hairline bg-surface opacity-80'
          : 'border-hairline bg-surface hover:bg-surface-raised'
      }`}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md text-[13px] font-bold ${
          done ? 'bg-ok-soft text-ok' : 'bg-surface-raised text-ink-muted'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-ink">{title}</span>
          {done ? <StatusPill status="completed" /> : null}
        </span>
        <span className="mt-0.5 block text-[12px] text-ink-muted">{body}</span>
      </span>
    </Link>
  )
}

export default async function PanelHomePage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  let isPlatformAdmin = false
  try {
    ;({ org, supabase, isPlatformAdmin } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const sinceToday = todayStart.toISOString()

  const [setup, rest] = await Promise.all([
    getSetupProgress(org.id),
    Promise.all([
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
        .gte('created_at', sinceToday),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'in')
        .gte('created_at', sinceToday),
      supabase
        .from('campaigns')
        .select('id, name, sent_count, failed_count, status, total_targets')
        .eq('org_id', org.id)
        .order('updated_at', { ascending: false })
        .limit(3),
    ]),
  ])

  const [
    { count: lists },
    { count: campaignsRunning },
    { count: outToday },
    { count: inToday },
    { data: recentCampaigns },
  ] = rest

  const { connectedCount, contactCount, outCount } = setup.counts
  const hasLine = connectedCount > 0
  const hasGroup = (lists ?? 0) > 0 || contactCount > 0
  const ready = setup.allDone
  const suggestFirstSend = ready && outCount === 0

  // Tek net sonraki adım — menüde kaybolmasın.
  let next: { href: string; title: string; body: string; cta: string }
  if (!hasLine) {
    next = {
      href: '/hesaplar',
      title: 'WhatsApp hattını bağla',
      body: 'Telefondaki WhatsApp → Bağlı cihazlar → QR okut. Bu 1 dakikalık iş.',
      cta: 'Hattı bağla',
    }
  } else if (!hasGroup) {
    next = {
      href: '/kisiler#gruplar',
      title: 'Kişi grubu ekle',
      body: 'Excel yükle veya numaraları yapıştır. Kampanyada bu grubu seçeceksin.',
      cta: 'Grup oluştur',
    }
  } else if (suggestFirstSend) {
    next = {
      href: '/kampanyalar#yeni-kampanya',
      title: 'İlk mesajını gönder',
      body: 'Mesajı yaz, grubu ve hattı seç, başlat. Başka ayar yok.',
      cta: 'Kampanya oluştur',
    }
  } else {
    next = {
      href: '/kampanyalar#yeni-kampanya',
      title: 'Yeni kampanya gönder',
      body: 'Aynı akış: mesaj → grup → hat → gönder.',
      cta: 'Kampanya oluştur',
    }
  }

  return (
    <>
      <PageHeader
        title={org.name}
        description="Üç adım: hat bağla → kişi ekle → mesaj gönder. Hedef: ~3 dakika."
        action={<AccentLink href={next.href}>{next.cta}</AccentLink>}
      />

      {isPlatformAdmin ? null : <SetupBanner progress={setup} />}

      <NextStepHero {...next} />

      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <MiniStep
          href="/hesaplar"
          n={1}
          title="Hat"
          done={hasLine}
          body={hasLine ? `${connectedCount} bağlı` : 'QR ile bağla'}
        />
        <MiniStep
          href="/kisiler#gruplar"
          n={2}
          title="Kişiler"
          done={hasGroup}
          body={
            hasGroup
              ? `${contactCount} numara · ${lists ?? 0} grup`
              : 'Excel veya yapıştır'
          }
        />
        <MiniStep
          href="/kampanyalar#yeni-kampanya"
          n={3}
          title="Gönder"
          done={!suggestFirstSend && ready && hasGroup && hasLine}
          body="Mesaj + grup + hat"
        />
      </div>

      <Card>
        <CardHeader
          title="Son kampanyalar"
          subtitle="Durum için dokun."
          action={<QuietLink href="/kampanyalar">Tümü</QuietLink>}
        />
        {(recentCampaigns ?? []).length === 0 ? (
          <div className="space-y-2 p-3.5 text-[13px] text-ink-muted">
            <p>Henüz kampanya yok — yukarıdaki yeşil adımdan başla.</p>
            <AccentLink href="/kampanyalar#yeni-kampanya">Kampanya oluştur</AccentLink>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {(recentCampaigns ?? []).map((c) => {
              const total = Math.max(0, c.total_targets ?? 0)
              return (
                <li key={c.id}>
                  <Link
                    href={`/kampanyalar/${c.id}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-surface-raised"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">
                        {c.name}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-ink-faint tabular">
                        {c.sent_count}
                        {total > 0 ? ` / ${total}` : ''} gitti
                        {(c.failed_count ?? 0) > 0 ? ` · ${c.failed_count} hata` : ''}
                      </span>
                    </span>
                    <StatusPill status={c.status} />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {(outToday ?? 0) + (inToday ?? 0) > 0 ? (
        <p className="mt-3 text-center text-[12.5px] text-ink-muted">
          Bugün {outToday ?? 0} giden · {inToday ?? 0} gelen.{' '}
          <Link href="/mesajlar" className="font-medium text-accent underline-offset-2 hover:underline">
            Mesajlar
          </Link>
          {(campaignsRunning ?? 0) > 0
            ? ` · ${campaignsRunning} kampanya çalışıyor`
            : ''}
        </p>
      ) : null}

      <p className="mt-3 text-center text-[12px] text-ink-faint">
        Takıldın mı?{' '}
        <Link href="/yardim" className="underline underline-offset-2">
          Yardım
        </Link>
      </p>
    </>
  )
}
