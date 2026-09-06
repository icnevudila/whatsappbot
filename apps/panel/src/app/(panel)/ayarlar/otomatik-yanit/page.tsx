import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Notice,
  PageHeader,
  Textarea,
} from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import {
  createAutoReplyRule,
  deleteAutoReplyRule,
  setAutoReplyRuleEnabled,
} from './actions'

export const metadata = { title: 'Otomatik yanıt' }
export const dynamic = 'force-dynamic'

/**
 * Altyapı hazır; gönderim kapalı (org.auto_reply_enabled + worker AUTO_REPLY_ENABLED).
 * Kullanıcı kuralları yazabilir; sistem yanıt basmaz ta ki platform açana kadar.
 */
export default async function AutoReplyPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  let userId: string
  try {
    ;({ org, supabase, userId } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const [{ data: orgRow }, { data: rules }] = await Promise.all([
    supabase
      .from('organizations')
      .select('auto_reply_enabled')
      .eq('id', org.id)
      .maybeSingle(),
    supabase
      .from('auto_reply_rules')
      .select(
        'id, name, enabled, match_mode, match_pattern, reply_body, cooldown_seconds, priority',
      )
      .eq('org_id', org.id)
      .order('priority', { ascending: true }),
  ])

  const live = Boolean(
    (orgRow as { auto_reply_enabled?: boolean } | null)?.auto_reply_enabled,
  )
  const canEdit = isOrgAdminRole(org.role)

  return (
    <>
      <PageHeader
        title="Otomatik yanıt"
        description="Gelen mesaja kurala göre cevap. Şu an kapalı — kurallar hazırlanabilir."
        action={
          <Link href="/ayarlar" className="text-[13px] text-accent underline-offset-2 hover:underline">
            ← Ayarlar
          </Link>
        }
      />

      <Notice tone={live ? 'accent' : 'warn'}>
        {live
          ? 'İşletmede otomatik yanıt açık görünüyor. Worker’da da AUTO_REPLY_ENABLED=true olmalı.'
          : 'Kapalı. Kuralları kaydedebilirsin; gerçek gönderim platform açana kadar yapılmaz.'}
      </Notice>

      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title="Kurallar" subtitle={`${rules?.length ?? 0} kural`} />
          {(rules ?? []).length === 0 ? (
            <p className="p-3.5 text-[13px] text-ink-muted">Henüz kural yok.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {(rules ?? []).map((rule) => (
                <li key={rule.id} className="space-y-2 px-3.5 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink">{rule.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-faint">
                        {rule.match_mode}
                        {rule.match_pattern ? `: “${rule.match_pattern}”` : ''} ·{' '}
                        {rule.cooldown_seconds}sn bekleme
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[12.5px] text-ink-muted">
                        {rule.reply_body}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex gap-1.5">
                        <form action={setAutoReplyRuleEnabled}>
                          <input type="hidden" name="rule_id" value={rule.id} />
                          <input
                            type="hidden"
                            name="enabled"
                            value={rule.enabled ? '0' : '1'}
                          />
                          <Button type="submit" className="text-[12px]">
                            {rule.enabled ? 'Kuralı durdur' : 'Kuralı aç'}
                          </Button>
                        </form>
                        <form action={deleteAutoReplyRule}>
                          <input type="hidden" name="rule_id" value={rule.id} />
                          <Button type="submit" variant="danger" className="text-[12px]">
                            Sil
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canEdit ? (
          <Card>
            <CardHeader title="Yeni kural" subtitle="Gönderim yine kapalı kalır." />
            <form action={createAutoReplyRule} className="space-y-2.5 p-3.5">
              <input type="hidden" name="created_by" value={userId} />
              <Field label="Ad">
                <Input name="name" defaultValue="Karşılama" required />
              </Field>
              <Field label="Eşleşme" hint="contains / equals / any / regex">
                <select
                  name="match_mode"
                  defaultValue="contains"
                  className="h-10 w-full rounded-md border border-hairline bg-surface px-2 text-[13px]"
                >
                  <option value="contains">İçeriyorsa</option>
                  <option value="equals">Tam eşitse</option>
                  <option value="any">Her metinde</option>
                  <option value="regex">Regex</option>
                </select>
              </Field>
              <Field label="Kalıp" hint="any için boş bırakılabilir">
                <Input name="match_pattern" placeholder="fiyat" />
              </Field>
              <Field label="Yanıt metni">
                <Textarea name="reply_body" rows={4} required placeholder="Merhaba…" />
              </Field>
              <Field label="Bekleme (sn)">
                <Input name="cooldown_seconds" type="number" defaultValue={3600} min={0} />
              </Field>
              <Button type="submit" variant="accent">
                Kaydet
              </Button>
            </form>
          </Card>
        ) : (
          <Notice tone="warn">Kuralları yalnızca sahip / yönetici düzenler.</Notice>
        )}
      </div>
    </>
  )
}
