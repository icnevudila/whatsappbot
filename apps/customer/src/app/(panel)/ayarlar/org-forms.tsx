'use client'

import { useActionState, useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/icon'
import { useToast } from '@/components/toast'
import { Button, Card, CardHeader, EmptyState, Field, Input, Notice, Select } from '@/components/ui'
import { CONTACT_EMAIL, contactMailto } from '@/lib/contact'
import { OrgSwitcher, type OrgOption } from '../org-switcher'
import { QuotaRow } from './quota-row'
import {
  addOrgMember,
  deleteOrganization,
  removeOrgMember,
  updateOrgMemberRole,
  updateOrgName,
  updateOrgAiImageMode,
  type OrgActionState,
} from '../org-actions'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Sahip',
  admin: 'Yönetici',
  member: 'Üye',
}

export function OrgSettingsForm({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader
        title={orgName}
        subtitle="İşletme adı"
        action={
          <>
            <button
              type="button"
              aria-label="İşletme adını düzenle"
              title="Düzenle"
              onClick={() => setOpen(true)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas"
            >
              <Icon name="edit" className="size-4" />
            </button>
            {open ? <EditOrgNameModal orgName={orgName} onClose={() => setOpen(false)} /> : null}
          </>
        }
      />
    </Card>
  )
}

function EditOrgNameModal({
  orgName,
  onClose,
}: {
  orgName: string
  onClose: () => void
}) {
  const titleId = useId()
  const router = useRouter()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    updateOrgName,
    null,
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) {
      toast(state.ok, 'success')
      onClose()
      router.refresh()
    }
  }, [state?.error, state?.ok, toast, onClose, router])

  if (!mounted) return null

  return createPortal(
    <div className="wb-modal-root" role="presentation">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="wb-modal-panel wb-wa-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              İşletme adını değiştir
            </h2>
            <p className="wb-modal-desc">Bu ad panelde ve ekip üyelerine görünür.</p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <form action={formAction} className="space-y-3">
          <Field label="İşletme adı">
            <Input
              name="name"
              defaultValue={orgName}
              minLength={2}
              required
              autoFocus
              placeholder="Örn. Ajans adı"
            />
          </Field>
          {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
          <div className="wb-modal-actions">
            <Button type="button" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" className="wb-wa-submit" disabled={pending}>
              {pending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

export function AiImageModeForm({
  initialMode,
  canEdit,
}: {
  initialMode: string
  canEdit: boolean
}) {
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    updateOrgAiImageMode,
    null,
  )
  const [mode, setMode] = useState(initialMode || 'economic')

  return (
    <form action={formAction} className="space-y-3 p-3.5">
      <input type="hidden" name="ai_image_mode" value={mode} />

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div
          role="button"
          tabIndex={0}
          className={`cursor-pointer rounded-[var(--radius-card)] border p-3 transition-colors ${
            mode === 'economic'
              ? 'border-accent bg-accent-soft/30'
              : 'border-hairline bg-surface hover:border-hairline-strong'
          }`}
          onClick={() => canEdit && setMode('economic')}
          onKeyDown={(e) => {
            if (canEdit && (e.key === ' ' || e.key === 'Enter')) setMode('economic')
          }}
        >
          <div className="flex items-start gap-2.5">
            <input
              type="radio"
              name="_mode_radio"
              checked={mode === 'economic'}
              onChange={() => canEdit && setMode('economic')}
              className="mt-0.5 accent-accent"
              disabled={!canEdit}
            />
            <div>
              <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
                <span>Maksimum Tasarruf</span>
                <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-ink">
                  Önerilen
                </span>
              </div>
              <p className="mt-1 text-[12px] text-ink-muted">
                OmniStudio otonom motoru kullanılır. Ek API maliyeti oluşturmaz.
              </p>
              <div className="mt-2 text-[11.5px] text-ink-faint">
                Ortalama süre: ~70 sn · Sınırsız
              </div>
            </div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`cursor-pointer rounded-[var(--radius-card)] border p-3 transition-colors ${
            mode === 'fast'
              ? 'border-accent bg-accent-soft/30'
              : 'border-hairline bg-surface hover:border-hairline-strong'
          }`}
          onClick={() => canEdit && setMode('fast')}
          onKeyDown={(e) => {
            if (canEdit && (e.key === ' ' || e.key === 'Enter')) setMode('fast')
          }}
        >
          <div className="flex items-start gap-2.5">
            <input
              type="radio"
              name="_mode_radio"
              checked={mode === 'fast'}
              onChange={() => canEdit && setMode('fast')}
              className="mt-0.5 accent-accent"
              disabled={!canEdit}
            />
            <div>
              <div className="text-[13.5px] font-bold text-ink">
                Maksimum Hız
              </div>
              <p className="mt-1 text-[12px] text-ink-muted">
                Doğrudan resmi OpenAI DALL-E API&apos;sini kullanır. Çok hızlıdır ancak API bakiyesinden harcar.
              </p>
              <div className="mt-2 text-[11.5px] text-ink-faint">
                Ortalama süre: ~20 sn · Hızlı teslimat
              </div>
            </div>
          </div>
        </div>
      </div>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      {canEdit ? (
        <Button type="submit" variant="accent" className="wb-wa-submit" disabled={pending}>
          {pending ? 'Kaydediliyor…' : 'Modu Kaydet'}
        </Button>
      ) : null}
    </form>
  )
}

export function OrgsCard({
  orgs,
  activeOrgId,
  used,
  total,
}: {
  orgs: OrgOption[]
  activeOrgId: string
  used: number
  total: number
}) {
  const canCreate = used < total
  return (
    <Card>
      <CardHeader
        title="İşletmeler"
        subtitle={`${used} / ${total} hak`}
        action={
          canCreate ? (
            <Link
              href="/ayarlar/isletme/yeni"
              className="wb-wa-text-btn"
            >
              <Icon name="plus" className="size-3.5" />
              Yeni işletme
            </Link>
          ) : null
        }
      />
      <div className="space-y-3 p-3.5">
        <QuotaRow
          label="İşletme hakkı"
          used={used}
          total={total}
          hint={
            canCreate
              ? 'Sahibi olduğunuz işletmeler. Hakkınız varsa yeni işletme ekleyin.'
              : 'Limit doldu. Yeni işletme için destekle iletişime geçin.'
          }
        />
        <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} compact />
      </div>
    </Card>
  )
}

export function AddMemberButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="wb-wa-text-btn" onClick={() => setOpen(true)}>
        <Icon name="plus" className="size-3.5" />
        Üye ekle
      </button>
      {open ? <AddMemberModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const titleId = useId()
  const router = useRouter()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    addOrgMember,
    null,
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) {
      toast(state.ok, 'success')
      onClose()
      router.refresh()
    }
  }, [state?.error, state?.ok, toast, onClose, router])

  if (!mounted) return null

  return createPortal(
    <div className="wb-modal-root" role="presentation">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="wb-modal-panel wb-wa-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              Üye ekle
            </h2>
            <p className="wb-modal-desc">Mevcut hesap e-postası ile ekibe katın.</p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <form action={formAction} className="space-y-3">
          <Field label="E-posta" hint="Kayıtlı hesap e-postası.">
            <Input
              name="email"
              type="email"
              placeholder="ornek@firma.com"
              required
              autoComplete="off"
              autoFocus
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
          <div className="wb-modal-actions">
            <Button type="button" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" className="wb-wa-submit" disabled={pending}>
              {pending ? 'Ekleniyor…' : 'Üye ekle'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
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
