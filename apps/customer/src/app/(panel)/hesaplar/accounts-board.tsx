'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import type { Tables } from '@wa/shared'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Meter,
  Notice,
  StatStrip,
  StatusPill,
} from '@/components/ui'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { Icon, type IconName } from '@/components/icon'
import { useToast } from '@/components/toast'
import { useT } from '@/lib/i18n/provider'
import { formatTrMobileMask, isTrMobileMasked } from '@/lib/onboarding'
import { capToday } from '@/lib/capacity'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useServerSyncedState } from '@/lib/use-server-synced-state'
import {
  connectAccount,
  createAccountWithPairing,
  logoutAccount,
  removeAccount,
  requestPairingCode,
  sendSelfTest,
  type ActionState,
} from './actions'
import { PairingPanel } from './pairing-panel'
import { QrPanel } from './qr-panel'
import { RehberSyncModal } from '../kisiler/rehber-sync-modal'

export type AccountView = Pick<
  Tables<'accounts'>,
  | 'id'
  | 'label'
  | 'phone_e164'
  | 'status'
  | 'status_detail'
  | 'enabled'
  | 'is_locked'
  | 'lock_reason'
  | 'qr_code'
  | 'qr_expires_at'
  | 'pairing_code'
  | 'pairing_expires_at'
  | 'daily_send_limit'
  | 'sent_today'
  | 'sent_today_on'
  | 'warmup_started_at'
  | 'new_chat_quota_total'
  | 'new_chat_quota_used'
  | 'reachout_locked_until'
>

export function AccountsBoard({
  initial,
  orgId,
  accountsQuota,
  canManage = true,
}: {
  initial: AccountView[]
  orgId: string
  accountsQuota: number
  /** false ise hat silme gizli (üye). */
  canManage?: boolean
}) {
  // Sunucu revalidate ettiginde tazelensin, Realtime olaylari da uzerine yazsin.
  const [accounts, setAccounts] = useServerSyncedState(initial)
  const [flashIds, setFlashIds] = useState<Set<string>>(() => new Set())
  const toast = useToast()
  const knownStatus = useRef(new Map(initial.map((a) => [a.id, a.status])))

  const noteStatusChange = (next: AccountView) => {
    const prev = knownStatus.current.get(next.id)
    knownStatus.current.set(next.id, next.status)
    if (prev && prev !== 'connected' && next.status === 'connected') {
      toast(`${next.label} bağlandı.`, 'success')
      setFlashIds((cur) => {
        const copy = new Set(cur)
        copy.add(next.id)
        return copy
      })
      window.setTimeout(() => {
        setFlashIds((cur) => {
          const copy = new Set(cur)
          copy.delete(next.id)
          return copy
        })
      }, 1100)
    }
  }

  /**
   * Realtime olmadan QR kodu icin sayfayi elle yenilemek gerekiyordu.
   * Servis QR'i accounts.qr_code'a yazdigi an burasi guncelleniyor.
   */
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('accounts-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          setAccounts((current) => {
            if (payload.eventType === 'DELETE') {
              const removedId = (payload.old as { id?: string }).id
              if (removedId) knownStatus.current.delete(removedId)
              return current.filter((account) => account.id !== removedId)
            }

            const next = payload.new as AccountView
            noteStatusChange(next)
            const exists = current.some((account) => account.id === next.id)

            return exists
              ? current.map((account) =>
                  account.id === next.id ? { ...account, ...next } : account,
                )
              : [...current, next]
          })
        },
      )
      .subscribe((status, error) => {
        // Sessiz basarisizlik en kotusu: QR gelmedigi zaman nedenini
        // bilmeden bakiyorduk. Abonelik durumu artik konsola yaziliyor.
        if (status !== 'SUBSCRIBED') {
          console.warn('[accounts-live] realtime durumu:', status, error ?? '')
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
    // toast/noteStatusChange stable enough via refs; orgId drives channel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, setAccounts])

  /**
   * Realtime'a tek basina guvenmiyoruz.
   *
   * QR yalnizca 60 saniye, eslestirme kodu 3 dakika gecerli. Realtime soketi
   * kurulamadiginda (proxy, sekme uyanmasi, token tazeleme) kullanici bos bir
   * kart gorup "calismiyor" diyor. Bu yuzden hat gecis durumundayken kisa
   * arayla dogrudan sorguluyoruz. Bagli/kapali duruma gelince yoklama duruyor,
   * yani surekli bir yuk olusturmuyor.
   */
  /**
   * Kosul bilerek "qr_pending" degil "connected degil": durumu yalnizca
   * qr_pending iken yoklarsak, o duruma gectigini ogrenmek icin de yoklama
   * gerekir ve akis kilitlenir. Hat baglanmadigi surece yokluyoruz.
   */
  const waiting = accounts.some((account) => account.status !== 'connected')

  useEffect(() => {
    if (!waiting) return

    const supabase = getSupabaseBrowserClient()
    let cancelled = false

    const poll = async () => {
      const { data } = await supabase
        .from('accounts')
        .select(
          'id, label, phone_e164, status, status_detail, enabled, is_locked, lock_reason, qr_code, qr_expires_at, pairing_code, pairing_expires_at, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used, reachout_locked_until',
        )
        .eq('org_id', orgId)
        .order('created_at')

      if (!cancelled && data) {
        const rows = data as AccountView[]
        for (const row of rows) noteStatusChange(row)
        setAccounts(rows)
      }
    }

    // Sekme arkada iken yoklamiyoruz: QR'i kimse gormuyor, bosa istek olur.
    const tick = () => {
      if (document.visibilityState === 'visible') void poll()
    }

    const timer = setInterval(tick, 2_500)
    tick()

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [waiting, orgId, setAccounts])

  const connected = accounts.filter((account) => account.status === 'connected').length
  const remaining = Math.max(0, accountsQuota - accounts.length)
  const atCap = remaining === 0
  const sentTodayTotal = accounts.reduce((sum, account) => {
    const today = new Date().toISOString().slice(0, 10)
    return sum + (account.sent_today_on === today ? account.sent_today : 0)
  }, 0)

  const [addOpen, setAddOpen] = useState(false)

  const highlight = (id: string) => {
    setFlashIds((cur) => {
      const copy = new Set(cur)
      copy.add(id)
      return copy
    })
    window.setTimeout(() => {
      setFlashIds((cur) => {
        const copy = new Set(cur)
        copy.delete(id)
        return copy
      })
    }, 1100)
  }

  const addHatButton = () => (
    <Button
      type="button"
      variant="accent"
      disabled={atCap}
      className="min-h-11 w-full touch-manipulation sm:w-auto"
      onClick={() => setAddOpen(true)}
    >
      {atCap ? 'Kota dolu' : '+ Hat ekle'}
    </Button>
  )

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <StatStrip
          className="mb-0 min-w-0 flex-1"
          items={[
            {
              label: 'Bağlı',
              value: connected,
              tone: connected > 0 ? 'ok' : 'default',
            },
            { label: 'Bugün', value: sentTodayTotal },
            {
              label: 'Kota',
              value: `${accounts.length}/${accountsQuota}`,
              tone: atCap ? 'danger' : 'default',
            },
          ]}
        />
        {addHatButton()}
      </div>

      {accounts.length === 0 ? (
        <Card lift className="border-accent/20 bg-accent-soft/40">
          <EmptyState
            tone="phone"
            title="Henüz hat yok"
            description="Numaranızı yazın, eşleştirme kodunu WhatsApp’ta girin. Bağlanınca hat kaydedilir."
            action={addHatButton()}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {accounts.map((account, index) => (
            <div
              key={account.id}
              className={`wb-row-enter${flashIds.has(account.id) ? ' wb-row-flash' : ''}`}
              style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
            >
              <AccountCard account={account} canManage={canManage} />
            </div>
          ))}
        </div>
      )}

      {addOpen ? (
        <AddHatModal
          remaining={remaining}
          accounts={accounts}
          onClose={() => setAddOpen(false)}
          onCreated={highlight}
        />
      ) : null}
    </div>
  )
}

function AddHatModal({
  remaining,
  accounts,
  onClose,
  onCreated,
}: {
  remaining: number
  accounts: AccountView[]
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const titleId = useId()
  const toast = useToast()
  const [phone, setPhone] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  useSyncBusy(pending, 'Eşleştirme kodu isteniyor…')

  const live = accounts.find((item) => item.id === accountId) ?? null
  const connected = live?.status === 'connected'

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    setError(null)
    start(async () => {
      const result = await createAccountWithPairing(phone)
      if (result?.error) {
        setError(result.error)
        toast(result.error, 'danger')
        if (result.accountId) {
          setAccountId(result.accountId)
          onCreated(result.accountId)
        }
        return
      }
      if (result?.accountId) {
        setAccountId(result.accountId)
        onCreated(result.accountId)
      }
    })
  }

  return (
    <div className="wb-modal-root">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="wb-modal-panel wb-modal-panel--wide" role="dialog" aria-labelledby={titleId}>
        <h2 id={titleId} className="wb-modal-title">
          {connected ? 'Hat bağlandı' : 'Hat ekle'}
        </h2>
        {connected ? (
          <p className="wb-modal-desc">WhatsApp hattı eşlendi ve kaydedildi.</p>
        ) : (
          <p className="wb-modal-desc">
            Numaranızı yazın. Kod WhatsApp → Bağlı cihazlar → Telefon numarasıyla bağla
            menüsüne girilir.
            {remaining > 0 ? ` Kalan hak: ${remaining}.` : ''}
          </p>
        )}

        {connected ? (
          <div className="mt-4 space-y-3">
            <Notice tone="success">Tamamlandı. Hat listenize eklendi.</Notice>
            <div className="wb-modal-actions [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
              <Button type="button" variant="accent" onClick={onClose}>
                Tamam
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!pending && !accountId && isTrMobileMasked(phone)) submit()
            }}
          >
            <Field label="WhatsApp numarası" hint="Yalnızca 05XX XXX XX XX">
              <Input
                name="phone"
                inputMode="numeric"
                autoComplete="tel-national"
                autoFocus
                value={phone}
                placeholder="05XX XXX XX XX"
                disabled={pending || Boolean(accountId)}
                className="min-h-11 text-[16px] tracking-wide"
                onChange={(event) => setPhone(formatTrMobileMask(event.target.value))}
              />
            </Field>
            {error ? <Notice tone="danger">{error}</Notice> : null}
            {live?.pairing_code ? (
              <PairingPanel code={live.pairing_code} expiresAt={live.pairing_expires_at} />
            ) : accountId ? (
              <p className="rounded-md border border-hairline bg-canvas px-3 py-3 text-[13px] text-ink-muted">
                Eşleştirme kodu hazırlanıyor…
              </p>
            ) : null}
            <div className="wb-modal-actions flex-col-reverse sm:flex-row [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
              <Button type="button" onClick={onClose}>
                Vazgeç
              </Button>
              {accountId ? null : (
                <Button
                  type="submit"
                  variant="accent"
                  disabled={pending || !isTrMobileMasked(phone)}
                >
                  {pending ? 'Kod isteniyor…' : 'Eşleştirme kodu al'}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function AccountActionsMenu({
  account,
  canManage,
  pending,
  onTest,
  onImport,
  onLogout,
  onReconnect,
  onDelete,
}: {
  account: AccountView
  canManage: boolean
  pending: boolean
  onTest: () => void
  onImport: () => void
  onLogout: () => void
  onReconnect: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const connected = account.status === 'connected'
  const items: {
    key: string
    label: string
    icon: IconName
    danger?: boolean
    onSelect: () => void
  }[] = []

  if (connected) {
    if (!account.is_locked) {
      items.push({ key: 'test', label: 'Test mesaj', icon: 'send', onSelect: onTest })
    }
    items.push({
      key: 'import',
      label: 'Rehberi içe aktar',
      icon: 'people',
      onSelect: onImport,
    })
    items.push({
      key: 'logout',
      label: 'WhatsApp’tan çıkış yap',
      icon: 'logout',
      danger: true,
      onSelect: onLogout,
    })
  } else if (!account.is_locked) {
    items.push({
      key: 'reconnect',
      label: 'Yeniden bağla',
      icon: 'refresh',
      onSelect: onReconnect,
    })
  }

  if (canManage) {
    items.push({ key: 'delete', label: 'Sil', icon: 'trash', danger: true, onSelect: onDelete })
  }

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Hat işlemleri"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-hairline bg-surface text-ink-muted transition-colors hover:border-accent/30 hover:bg-accent-soft/50 hover:text-ink disabled:opacity-50"
      >
        <Icon name="ellipsis" className="size-[18px]" strokeWidth={2.2} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-[220px] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]"
        >
          {items.map((item, index) => {
            const prevDanger = items[index - 1]?.danger
            return (
              <div key={item.key}>
                {item.danger && !prevDanger ? (
                  <div className="my-1 border-t border-hairline" role="separator" />
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  className={`flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[13px] font-medium transition-colors hover:bg-canvas disabled:opacity-50 ${
                    item.danger ? 'text-danger' : 'text-ink'
                  }`}
                  onClick={() => {
                    setOpen(false)
                    item.onSelect()
                  }}
                >
                  <Icon name={item.icon} className="size-4 shrink-0 opacity-80" />
                  {item.label}
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function AccountCard({
  account,
  canManage = true,
}: {
  account: AccountView
  canManage?: boolean
}) {
  const confirm = useConfirm()
  const toast = useToast()
  const t = useT()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [rehberOpen, setRehberOpen] = useState(false)
  useSyncBusy(pending, 'Hat işlemi…', account.label)

  const run = (action: () => Promise<ActionState>, okToast?: string) => {
    setMessage(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setMessage(result.error)
        toast(result.error, 'danger')
        return
      }
      if (okToast) toast(okToast, 'success')
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  const sentToday = account.sent_today_on === today ? account.sent_today : 0
  // Gunluk tavan isinma egrisini hesaba katar; ham daily_send_limit
  // gostermek "neden 100'e cikmiyor" kafa karisikligi yaratirdi.
  const dayCap = Math.max(1, capToday(account))

  const quotaTotal = account.new_chat_quota_total
  const quotaUsed = account.new_chat_quota_used
  const quotaKnown = quotaTotal !== null && quotaUsed !== null
  const quotaTight = quotaKnown && quotaUsed / Math.max(1, quotaTotal) > 0.8

  const lockedUntil = account.reachout_locked_until
    ? new Date(account.reachout_locked_until)
    : null
  const reachoutActive = lockedUntil !== null && lockedUntil.getTime() > Date.now()

  const shell =
    account.is_locked
      ? 'border-danger/35 bg-[#fff5f4]'
      : account.status === 'connected'
        ? 'border-hairline bg-surface shadow-[inset_3px_0_0_var(--color-ok)]'
        : account.status === 'qr' || account.status === 'connecting'
          ? 'border-[#e8a317]/45 bg-[#fff8e8]'
          : 'border-hairline bg-surface'

  return (
    <Card lift className={shell}>
      <div className="flex items-start justify-between gap-3 border-b border-hairline/80 px-3.5 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex size-2.5 shrink-0 rounded-full ${
                account.is_locked
                  ? 'bg-danger'
                  : account.status === 'connected'
                    ? 'wb-live-dot bg-ok'
                    : account.status === 'qr' || account.status === 'connecting'
                      ? 'bg-warn'
                      : 'bg-ink-faint'
              }`}
              aria-hidden
            />
            <h3 className="truncate text-[15px] font-bold tracking-[-0.02em]">{account.label}</h3>
            <StatusPill status={account.is_locked ? 'banned' : account.status} />
          </div>
          <p className="mt-1 text-[12.5px] text-ink-muted tabular">
            {account.phone_e164 ?? 'Numara henüz bilinmiyor'}
            {account.status_detail ? ` · ${account.status_detail}` : ''}
          </p>
        </div>

        <AccountActionsMenu
          account={account}
          canManage={canManage}
          pending={pending}
          onTest={() => {
            void (async () => {
              const ok = await confirm({
                title: 'Size test mesajı gönderilecek, istiyor musunuz?',
                description: 'Mesaj bu hattan kendi numaranıza gider.',
                confirmLabel: 'Evet, gönder',
                cancelLabel: 'Vazgeç',
                tone: 'accent',
              })
              if (!ok) return
              run(() => sendSelfTest(account.id), 'Test mesajı gönderildi.')
            })()
          }}
          onImport={() => setRehberOpen(true)}
          onLogout={() => {
            void (async () => {
              const ok = await confirm({
                title: t('confirm.waLogoutTitle'),
                description: t('confirm.waLogoutBody'),
                confirmLabel: t('confirm.waLogoutConfirm'),
                cancelLabel: t('common.cancel'),
                tone: 'danger',
              })
              if (!ok) return
              run(() => logoutAccount(account.id), 'WhatsApp oturumu kapatıldı.')
            })()
          }}
          onReconnect={() => run(() => connectAccount(account.id))}
          onDelete={() => {
            void (async () => {
              const ok = await confirm({
                title: t('confirm.deleteLineTitle'),
                description: t('confirm.deleteLineBody'),
                confirmLabel: t('confirm.deleteLineConfirm'),
                cancelLabel: t('common.cancel'),
                tone: 'danger',
              })
              if (!ok) return
              run(() => removeAccount(account.id), 'Hat silindi.')
            })()
          }}
        />
      </div>

      <div className="space-y-2.5 p-3.5">
        {account.is_locked && account.lock_reason ? (
          <Notice tone="danger">
            <span className="font-medium">Hat kilitli.</span> {account.lock_reason}
            <br />
            Bu hatla gönderim yapılmıyor ve bağlı kampanyalar durduruldu.
          </Notice>
        ) : null}

        {account.status !== 'connected' && !account.is_locked ? (
          <PairingSection account={account} />
        ) : null}

        {account.status === 'connected' ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[11.5px] text-ink-muted">Bugün</span>
                <span className="text-[11.5px] text-ink tabular">
                  {sentToday} / {dayCap}
                </span>
              </div>
              <Meter
                value={sentToday}
                max={dayCap}
                tone={sentToday >= dayCap ? 'warn' : 'accent'}
              />
              {dayCap < account.daily_send_limit ? (
                <p className="mt-1 text-[11px] text-ink-faint">Isınma tavanı {dayCap}</p>
              ) : null}
            </div>

            {quotaKnown ? (
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[11.5px] text-ink-muted">Yeni sohbet</span>
                  <span className="text-[11.5px] text-ink tabular">
                    {quotaUsed} / {quotaTotal}
                  </span>
                </div>
                <Meter
                  value={quotaUsed ?? 0}
                  max={quotaTotal ?? 1}
                  tone={quotaTight ? 'danger' : 'accent'}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {reachoutActive ? (
          <Notice tone="warn">
            Yeni sohbet kilidi{' '}
            <span className="tabular">
              {lockedUntil!.toLocaleString('tr-TR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            ’a kadar aktif. Bu sürede yalnızca önceki sohbetlere yazılabilir; yeni
            numaralara gönderim durur.
          </Notice>
        ) : null}

        {message ? <Notice tone="danger">{message}</Notice> : null}
      </div>

      {rehberOpen ? (
        <RehberSyncModal
          accounts={[
            {
              id: account.id,
              label: account.label,
              phone_e164: account.phone_e164,
              status: account.status,
            },
          ]}
          initialAccountId={account.id}
          onClose={() => setRehberOpen(false)}
        />
      ) : null}
    </Card>
  )
}

/**
 * Iki baglanma yolu: QR okutmak veya telefona kod istemek.
 *
 * Kod yolu, bilgisayar ekranini telefonla goremeyen kullanicilar icin
 * (uzaktan kurulum, tek cihazda calisma) tek pratik secenek. Servis kod
 * uretildiginde qr_code'u temizliyor, bu yuzden hangi kutunun gosterilecegi
 * dogrudan veriden okunuyor.
 */
function PairingSection({ account }: { account: AccountView }) {
  const [mode, setMode] = useState<'qr' | 'code'>(account.pairing_code ? 'code' : 'qr')
  const [phone, setPhone] = useState(account.phone_e164 ?? '')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [waitingCode, setWaitingCode] = useState(false)
  useSyncBusy(pending || waitingCode, 'Eşleştirme kodu hazırlanıyor…', account.label)

  // Kod veritabanina dustugunde sekmeyi otomatik ac: kullanici "Kod al"
  // basip QR sekmesinde kalirsa kodu hic gormuyor.
  useEffect(() => {
    if (account.pairing_code) {
      setMode('code')
      setWaitingCode(false)
    }
  }, [account.pairing_code])

  const ask = () => {
    setError(null)
    setWaitingCode(true)
    setMode('code')
    startTransition(async () => {
      const result = await requestPairingCode(account.id, phone)
      if (result?.error) {
        setError(result.error)
        setWaitingCode(false)
      }
    })
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1 rounded-md border border-hairline bg-canvas p-0.5">
        {(
          [
            ['qr', 'QR ile bağla'],
            ['code', 'Telefon numarasıyla bağla'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`flex-1 rounded px-3 py-1.5 text-[12px] font-medium transition-colors ${
              mode === key
                ? 'bg-surface text-ink'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'qr' ? (
        account.qr_code ? (
          <QrPanel qr={account.qr_code} expiresAt={account.qr_expires_at} />
        ) : (
          <p className="rounded-md border border-hairline bg-canvas px-3.5 py-5 text-center text-[12.5px] text-ink-muted">
            {account.status === 'qr_pending' || account.status === 'connecting'
              ? 'QR kodu hazırlanıyor… birkaç saniye bekleyin.'
              : 'Hat eklendiğinde QR otomatik gelir. Gelmezse yukarıdan “Yeniden bağla”ya basın.'}
          </p>
        )
      ) : account.pairing_code ? (
        <PairingPanel
          code={account.pairing_code}
          expiresAt={account.pairing_expires_at}
        />
      ) : (
        <div className="rounded-md border border-hairline bg-canvas p-3.5">
          <Field
            label="Bağlanacak WhatsApp numarası"
            hint="Ülke koduyla, fazla rakam olmadan. Örnek: +90 545 365 13 19"
          >
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+90 532 123 45 67"
              inputMode="tel"
            />
          </Field>

          <Button
            variant="accent"
            onClick={ask}
            disabled={pending || waitingCode || phone.trim().length < 10}
            className="mt-3"
          >
            {pending || waitingCode ? 'Kod hazırlanıyor…' : 'Kod al'}
          </Button>

          {waitingCode && !error ? (
            <p className="mt-3 text-[12.5px] text-ink-muted">
              Servis kodu üretiyor. Birkaç saniye içinde burada büyük harflerle
              görünecek; WhatsApp → Bağlı cihazlar → Telefon numarasıyla bağla.
            </p>
          ) : null}

          {error ? (
            <div className="mt-3">
              <Notice tone="danger">{error}</Notice>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
