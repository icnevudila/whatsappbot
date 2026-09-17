import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import {
  createAutoReplyRule,
  deleteAutoReplyRule,
  setAutoReplyRuleEnabled,
  updateAutoReplySettings,
} from './actions'

export const metadata: Metadata = { title: 'Otomatik Yanıt Ayarları' }

const MATCH_MODE_LABELS: Record<string, string> = {
  contains: 'İçeriyorsa',
  equals: 'Birebir eşitse',
  regex: 'Regex (Düzenli İfade)',
  any: 'Herhangi bir mesaj',
}

export default async function AutoReplySettingsPage() {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']

  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const canManage = isOrgAdminRole(org.role)
  if (!canManage) {
    redirect('/ayarlar')
  }

  const [{ data: orgData }, { data: rules }] = await Promise.all([
    supabase
      .from('organizations')
      .select(
        'auto_reply_enabled, auto_reply_contact_policy, auto_reply_schedule, auto_reply_operator_silence_minutes, auto_reply_escalation_message'
      )
      .eq('id', org.id)
      .single(),
    supabase
      .from('auto_reply_rules')
      .select('*')
      .eq('org_id', org.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  const settings = orgData as {
    auto_reply_enabled?: boolean
    auto_reply_contact_policy?: string
    auto_reply_schedule?: string
    auto_reply_operator_silence_minutes?: number
    auto_reply_escalation_message?: string
  } | null

  const isEnabled = Boolean(settings?.auto_reply_enabled)
  const contactPolicy = settings?.auto_reply_contact_policy ?? 'unknown_only'
  const schedule = settings?.auto_reply_schedule ?? 'always'
  const silenceMinutes = settings?.auto_reply_operator_silence_minutes ?? 30
  const escalationMsg =
    settings?.auto_reply_escalation_message ??
    'Talebinizi aldık. Sizi müşteri temsilcimize aktarıyorum, en kısa sürede sizinle iletişime geçilecektir.'

  return (
    <div className="filo-fade-in mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PageHeader
          title="Otomatik Yanıt ve Koruma Ayarları"
          description="Gelen mesajlara kurallar veya yapay zeka ile otomatik yanıt verme ve güvenlik limitleri."
        />
        <Link
          href="/ayarlar"
          className="text-[13px] font-medium text-ink-muted hover:text-ink underline underline-offset-4"
        >
          ← Ayarlar
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Genel Bot Güvenlik Kuralları"
          subtitle="İşletmenizin hattını korumak için devreye giren otomatik susturma ve filtre mekanizmaları."
          action={
            <Badge tone={isEnabled ? 'accent' : 'neutral'}>
              {isEnabled ? 'Aktif' : 'Devre Dışı'}
            </Badge>
          }
        />
        <form action={updateAutoReplySettings} className="space-y-4 p-4">
          <div className="flex items-center justify-between rounded-lg border border-hairline bg-surface-raised/40 p-3">
            <div>
              <span className="block text-[13.5px] font-semibold text-ink">
                Otomatik Yanıt Sistemi
              </span>
              <span className="text-[12.5px] text-ink-muted">
                Tüm otomatik cevap ve kural motorunu açar veya kapatır.
              </span>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                name="auto_reply_enabled"
                value="1"
                defaultChecked={isEnabled}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-hairline-strong after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-hairline after:bg-surface after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-focus:outline-none" />
            </label>
          </div>

          <Field
            label="Rehber Koruması (Kişisel Numara Güvenliği)"
            hint="Kişisel telefonunuzdaki kayıtlı rehber kişilerine botun yanlışlıkla yanıt vermesini önler."
          >
            <Select
              name="auto_reply_contact_policy"
              defaultValue={contactPolicy}
            >
              <option value="unknown_only">
                Yalnızca Rehberde Olmayan Numaralara Yanıt Ver (Önerilen)
              </option>
              <option value="all">
                Tüm Gelen Numaralara Yanıt Ver (Rehber Dahil)
              </option>
            </Select>
          </Field>

          <Field
            label="Çalışma Zamanı"
            hint="Botun hangi saatlerde devrede olacağını belirleyin."
          >
            <Select name="auto_reply_schedule" defaultValue={schedule}>
              <option value="always">Her Zaman Yanıt Ver (7/24)</option>
              <option value="outside_hours">
                Yalnızca Mesai Saatleri Dışında (İşletme Kapalıyken)
              </option>
              <option value="working_hours">
                Yalnızca Mesai Saatleri İçinde
              </option>
            </Select>
          </Field>

          <Field
            label="İnsan Operatör Susturma Süresi (Dakika)"
            hint="Siz veya ekibiniz müşteriye panelden veya telefondan mesaj yazdığınızda bot belirtilen süre boyunca susar."
          >
            <Input
              type="number"
              name="auto_reply_operator_silence_minutes"
              defaultValue={silenceMinutes}
              min={0}
              max={1440}
            />
          </Field>

          <Field
            label="Müşteri Temsilcisi Devir Mesajı"
            hint="Müşteri 'yetkili', 'insan', 'temsilci' gibi bir ifade kullandığında gönderilir ve bot 2 saat susturulur."
          >
            <Textarea
              name="auto_reply_escalation_message"
              defaultValue={escalationMsg}
              rows={2}
            />
          </Field>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="accent">
              Ayarları Kaydet
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Kelime Bazlı Otomatik Yanıt Kuralları"
          subtitle="Müşterinin yazdığı belirli kelimelere veya ifadelere göre tetiklenen hazır yanıtlar."
        />
        <div className="divide-y divide-hairline">
          {rules && rules.length > 0 ? (
            rules.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">
                      {r.name}
                    </span>
                    <Badge tone={r.enabled ? 'accent' : 'neutral'}>
                      {r.enabled ? 'Aktif' : 'Pasif'}
                    </Badge>
                    <span className="text-[11.5px] text-ink-faint">
                      ({MATCH_MODE_LABELS[r.match_mode] ?? r.match_mode})
                    </span>
                  </div>
                  {r.match_pattern ? (
                    <div className="text-[12px] text-ink-muted">
                      Tetikleyici: <code className="rounded bg-surface-raised px-1 py-0.5 text-ink font-mono text-[11px]">{r.match_pattern}</code>
                    </div>
                  ) : null}
                  <p className="line-clamp-2 text-[12.5px] text-ink-muted">
                    Yanıt: {r.reply_body}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 sm:pt-0">
                  <form action={setAutoReplyRuleEnabled}>
                    <input type="hidden" name="rule_id" value={r.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={r.enabled ? '0' : '1'}
                    />
                    <Button type="submit" variant="quiet" className="h-8 text-[12px]">
                      {r.enabled ? 'Durdur' : 'Etkinleştir'}
                    </Button>
                  </form>
                  <form action={deleteAutoReplyRule}>
                    <input type="hidden" name="rule_id" value={r.id} />
                    <Button type="submit" variant="danger" className="h-8 text-[12px]">
                      Sil
                    </Button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-[13px] text-ink-muted">
              Henüz tanımlı bir kelime kuralı yok. Aşağıdan yeni kural ekleyebilirsiniz.
            </div>
          )}
        </div>

        <div className="border-t border-hairline p-4">
          <h3 className="mb-3 text-[13.5px] font-semibold text-ink">
            Yeni Yanıt Kuralı Ekle
          </h3>
          <form action={createAutoReplyRule} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Kural Adı">
                <Input
                  name="name"
                  placeholder="Örn: Fiyat Bilgisi"
                  required
                />
              </Field>
              <Field label="Eşleşme Türü">
                <Select name="match_mode" defaultValue="contains">
                  <option value="contains">Mesaj kelimeyi içeriyorsa</option>
                  <option value="equals">Mesaj kelimeye birebir eşitse</option>
                  <option value="regex">Düzenli İfade (Regex)</option>
                  <option value="any">Herhangi bir mesaj geldiğinde</option>
                </Select>
              </Field>
            </div>

            <Field
              label="Tetikleyici Kelime / Cümle"
              hint="Eşleşme türü 'Herhangi bir mesaj' ise boş bırakabilirsiniz."
            >
              <Input
                name="match_pattern"
                placeholder="Örn: fiyat, ücret, kaç tl"
              />
            </Field>

            <Field label="Gönderilecek Yanıt">
              <Textarea
                name="reply_body"
                placeholder="Müşteriye gönderilecek hazır cevap metnini yazın..."
                rows={3}
                required
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-end">
              <Field
                label="Bekleme Süresi (Saniye)"
                hint="Aynı müşteriye bu kuralın tekrar tetiklenmesi için geçmesi gereken süre."
              >
                <Input
                  type="number"
                  name="cooldown_seconds"
                  defaultValue={3600}
                  min={0}
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" variant="accent" className="w-full sm:w-auto">
                  Kuralı Ekle
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
