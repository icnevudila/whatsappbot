'use client'

import { useActionState, useTransition } from 'react'
import { Button, EmptyState, Field, Input, Notice, Select } from '@/components/ui'
import {
  addOrgMember,
  removeOrgMember,
  updateOrgName,
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
      <Field
        label="İşletme adı"
        hint={
          canEdit
            ? 'Kampanya ve hesaplarda görünen ad.'
            : 'Yalnızca sahip veya yönetici değiştirebilir.'
        }
      >
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
          {pending ? 'Kaydediliyor…' : 'İşletmeyi kaydet'}
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
        hint="message.inbound ve campaign.completed olayları POST edilir."
      >
        <Input
          name="webhook_url"
          type="url"
          defaultValue={webhookUrl ?? ''}
          disabled={!canEdit}
          placeholder="https://example.com/hooks/filo"
        />
      </Field>
      <Field label="Webhook secret (opsiyonel)" hint="İstek başlığı: x-filo-secret">
        <Input
          name="webhook_secret"
          type="password"
          disabled={!canEdit}
          placeholder="••••••••"
          autoComplete="off"
        />
      </Field>
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
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    addOrgMember,
    null,
  )
  const [removing, startRemove] = useTransition()

  return (
    <div>
      {members.length === 0 ? (
        <EmptyState
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
                <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] text-ink-muted">
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
                {canManage && member.role !== 'owner' ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={removing}
                    onClick={() =>
                      startRemove(() => void removeOrgMember(member.userId))
                    }
                  >
                    Çıkar
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <form action={formAction} className="space-y-2.5 border-t border-hairline p-3.5">
          <Field
            label="Üye ekle"
            hint="Kullanıcı daha önce Filo’ya kayıt olmuş olmalı. E-posta tam eşleşir."
          >
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
              <option value="member">Üye — gönderim ve listeler</option>
              <option value="admin">Yönetici — ekip ve işletme</option>
            </Select>
          </Field>
          {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
          {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
          <Button type="submit" variant="accent" disabled={pending}>
            {pending ? 'Ekleniyor…' : 'Üye ekle'}
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
