'use client'

import { useActionState, useState, useTransition } from 'react'
import { useToast } from '@/components/toast'
import { Button, EmptyState, Field, Input, Notice, Select } from '@/components/ui'
import { CONTACT_EMAIL, contactMailto } from '@/lib/contact'
import {
  addOrgMember,
  deleteOrganization,
  removeOrgMember,
  updateOrgMemberRole,
  updateOrgName,
  updateOrgWarmup,
  updateOrgWebhook,
  type OrgActionState,
} from '../org-actions'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Sahip',
  admin: 'Yönetici',
  member: 'Üye',
}

export function OrgSettingsForm({
  orgName,
  canEdit,
}: {
  orgName: string
  canEdit: boolean
}) {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    updateOrgName,
    null,
  )

  return (
    <form action={formAction} className="space-y-2.5 p-3.5">
      <Field label="İşletme adı">
        <Input
          name="name"
          defaultValue={orgName}
          disabled={!canEdit}
          readOnly={!canEdit}
          minLength={2}
          required
          placeholder="Örn. Filo Ajans"
        />
      </Field>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      {canEdit ? (
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      ) : null}
    </form>
  )
}

export function WebhookSettingsForm({
  webhookUrl,
  canEdit,
}: {
  webhookUrl: string | null
  canEdit: boolean
}) {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    updateOrgWebhook,
    null,
  )

  return (
    <form action={formAction} className="space-y-2.5 p-3.5">
      <Field
        label="CRM webhook URL"
        hint="Gelen mesaj ve kampanya bitişinde bu adrese bildirim gider."
      >
        <Input
          name="webhook_url"
          type="url"
          defaultValue={webhookUrl ?? ''}
          disabled={!canEdit}
          placeholder="https://example.com/hooks/filo"
        />
      </Field>
      <Field
        label="Webhook secret (opsiyonel)"
        hint="Boş bırakırsanız mevcut secret değişmez. İsteğe özel güvenlik anahtarı."
      >
        <Input
          name="webhook_secret"
          type="password"
          disabled={!canEdit}
          placeholder="Yeni secret (isteğe bağlı)"
          autoComplete="off"
        />
      </Field>
      {canEdit ? (
        <label className="flex items-center gap-2 text-[12.5px] text-ink-muted">
          <input type="checkbox" name="clear_secret" value="1" className="rounded border-hairline" />
          Mevcut secret’i temizle
        </label>
      ) : null}
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
      {canEdit ? (
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? 'Kaydediliyor…' : 'Webhook kaydet'}
        </Button>
      ) : null}
    </form>
  )
}

export function MembersPanel({
  members,
  canManage,
}: {
  members: { userId: string; email: string | null; fullName: string | null; role: string }[]
  canManage: boolean
}) {
  const toast = useToast()
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    addOrgMember,
    null,
  )
  const [busy, startBusy] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionOk, setActionOk] = useState<string | null>(null)

  const runRemove = (userId: string) => {
    setActionError(null)
    setActionOk(null)
    startBusy(async () => {
      const result = await removeOrgMember(userId)
      if (result?.error) {
        setActionError(result.error)
        toast(result.error, 'danger')
      } else if (result?.ok) {
        setActionOk(result.ok)
        toast(result.ok, 'success')
      }
    })
  }

  const runRoleChange = (userId: string, role: string) => {
    setActionError(null)
    setActionOk(null)
    startBusy(async () => {
      const result = await updateOrgMemberRole(userId, role)
      if (result?.error) {
        setActionError(result.error)
        toast(result.error, 'danger')
      } else if (result?.ok) {
        setActionOk(result.ok)
        toast(result.ok, 'success')
      }
    })
  }

  return (
    <div>
      {members.length === 0 ? (
        <EmptyState
          tone="people"
          title="Henüz üye yok"
          description="İşletmeye kayıtlı üye bulunamadı. Yeniden giriş yapmayı deneyin."
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-2.5 px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">
                  {member.fullName ||
                    member.email ||
                    (member.role === 'owner' ? 'Sahip' : 'Üye')}
                </p>
                {member.email ? (
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
                    {member.email}
                  </p>
                ) : member.fullName ? (
                  <p className="mt-0.5 text-[11.5px] text-ink-faint">E-posta gizli</p>
                ) : (
                  <p className="mt-0.5 text-[11.5px] text-ink-faint">
                    Profil henüz doldurulmamış
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canManage && member.role !== 'owner' ? (
                  <Select
                    aria-label="Üye rolü"
                    value={member.role === 'admin' ? 'admin' : 'member'}
                    disabled={busy}
                    onChange={(event) => runRoleChange(member.userId, event.target.value)}
                    className="min-w-[7.5rem]"
                  >
                    <option value="member">Üye</option>
                    <option value="admin">Yönetici</option>
                  </Select>
                ) : (
                  <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] text-ink-muted">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                )}
                {canManage && member.role !== 'owner' ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy}
                    onClick={() => runRemove(member.userId)}
                  >
                    Çıkar
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {actionError ? (
        <div className="border-t border-hairline px-3.5 py-2.5">
          <Notice tone="danger">{actionError}</Notice>
        </div>
      ) : null}
      {actionOk ? (
        <div className="border-t border-hairline px-3.5 py-2.5">
          <Notice tone="accent">{actionOk}</Notice>
        </div>
      ) : null}

      {canManage ? (
        <form action={formAction} className="space-y-2.5 border-t border-hairline p-3.5">
          <Field label="Üye ekle" hint="Mevcut Filo hesabı e-postası.">
            <Input
              name="email"
              type="email"
              placeholder="ornek@firma.com"
              required
              autoComplete="off"
            />
          </Field>
          <Field label="Rol">
            <Select name="role" defaultValue="member">
              <option value="member">Üye</option>
              <option value="admin">Yönetici</option>
            </Select>
          </Field>
          {state?.error ? (
            <Notice tone="danger">
              {state.error}
              {state.contactSupport ? (
                <>
                  {' '}
                  Yazın:{' '}
                  <a
                    href={contactMailto('Filo hesap açma talebi')}
                    className="font-medium underline underline-offset-2"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </>
              ) : null}
            </Notice>
          ) : null}
          {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
          <Button type="submit" variant="accent" disabled={pending}>
            {pending ? 'İşleniyor…' : 'Üye ekle'}
          </Button>
        </form>
      ) : (
        <p className="border-t border-hairline px-3.5 py-2.5 text-[11.5px] text-ink-faint">
          Üye eklemek için yönetici veya sahip olmanız gerekir.
        </p>
      )}
    </div>
  )
}

export function DeleteOrganizationForm({
  orgName,
  hasStripeSubscription,
}: {
  orgName: string
  hasStripeSubscription?: boolean
}) {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    deleteOrganization,
    null,
  )

  return (
    <form action={formAction} className="space-y-2.5 p-3.5">
      <p className="text-[12.5px] leading-relaxed text-ink-muted">
        Bu işlem geri alınamaz: hatlar, kişiler, kampanyalar ve mesaj kayıtları silinir.
        {hasStripeSubscription
          ? ' Aktif Stripe aboneliğiniz varsa silmeden önce otomatik iptal denenir; başarısız olursa Stripe Portal’dan kontrol edin.'
          : ' Ücretli aboneliğiniz varsa önce müşteri portalından iptal etmeniz önerilir.'}
      </p>
      <Field
        label="Onay"
        hint={`Silmek için işletme adını yazın: ${orgName}`}
      >
        <Input
          name="confirmName"
          required
          autoComplete="off"
          placeholder={orgName}
        />
      </Field>
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? 'Siliniyor…' : 'İşletmeyi kalıcı sil'}
      </Button>
    </form>
  )
}

export function OrgWarmupSettingsForm({
  warmupEnabled,
  canEdit,
}: {
  warmupEnabled: boolean
  canEdit: boolean
}) {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    updateOrgWarmup,
    null,
  )
  const [enabled, setEnabled] = useState(warmupEnabled)

  return (
    <form action={formAction} className="space-y-3 p-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-ink">
              Numara Isındırma (Warm-Up) Koruması
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                enabled
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'bg-hairline text-ink-muted border border-hairline-strong'
              }`}
            >
              {enabled ? 'Açık' : 'Kapalı'}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed text-ink-muted">
            Yeni bağlanan hatların spam radarına girmemesi için ilk 14 gün günlük gönderim limiti
            kademeli artırılır (10, 25, 60, 120, 250+). Eski veya güvenli hatlar kullanıyorsanız
            kapatarak doğrudan tam kapasiteyle gönderim yapabilirsiniz.
          </p>
        </div>

        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            name="warmup_enabled"
            value="1"
            checked={enabled}
            disabled={!canEdit || pending}
            onChange={(e) => setEnabled(e.target.checked)}
            className="peer sr-only"
          />
          <div className="peer h-6 w-11 rounded-full bg-hairline-strong after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-hairline after:bg-surface after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-focus:outline-none" />
        </label>
      </div>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      {canEdit ? (
        <div className="pt-1">
          <Button type="submit" variant="accent" disabled={pending}>
            {pending ? 'Kaydediliyor…' : 'Ayarı Kaydet'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}

