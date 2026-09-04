'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Notice, Select } from '@/components/ui'
import {
  addOrgMember,
  updateOrgName,
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
    <form action={formAction} className="space-y-4 p-4">
      <Field label="İşletme adı" hint={canEdit ? undefined : 'Yalnızca yöneticiler değiştirebilir.'}>
        <Input
          name="name"
          defaultValue={orgName}
          disabled={!canEdit}
          readOnly={!canEdit}
          minLength={2}
          required
        />
      </Field>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      {canEdit ? (
        <Button type="submit" variant="quiet" disabled={pending}>
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
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

  return (
    <div>
      <ul className="divide-y divide-hairline">
        {members.map((member) => (
          <li
            key={member.userId}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {member.fullName ||
                  member.email ||
                  (member.role === 'owner' ? 'Sahip' : 'Üye')}
              </p>
              {member.email ? (
                <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">{member.email}</p>
              ) : member.fullName ? (
                <p className="mt-0.5 text-[11.5px] text-ink-faint">E-posta gizli</p>
              ) : (
                <p className="mt-0.5 text-[11.5px] text-ink-faint">Profil henüz doldurulmamış</p>
              )}
            </div>
            <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[11px] text-ink-muted">
              {ROLE_LABELS[member.role] ?? member.role}
            </span>
          </li>
        ))}
      </ul>

      {canManage ? (
        <form action={formAction} className="space-y-3 border-t border-hairline p-4">
          <Field label="Üye ekle" hint="Kullanıcı daha önce Filo’ya kayıt olmuş olmalı.">
            <Input name="email" type="email" placeholder="örnek@firma.com" required />
          </Field>
          <Field label="Rol">
            <Select name="role" defaultValue="member">
              <option value="member">Üye</option>
              <option value="admin">Yönetici</option>
            </Select>
          </Field>
          {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
          {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
          <Button type="submit" variant="quiet" disabled={pending}>
            {pending ? 'Ekleniyor…' : 'Ekle'}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
