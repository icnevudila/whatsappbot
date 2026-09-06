'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import type { Tables } from '@wa/shared'
import {
  AccentLink,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Meter,
  Notice,
  QuietLink,
  SplitPane,
  StatusPill,
} from '@/components/ui'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { useT } from '@/lib/i18n/provider'
import { capToday } from '@/lib/capacity'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useServerSyncedState } from '@/lib/use-server-synced-state'
import {
  connectAccount,
  createAccount,
  disconnectAccount,
  logoutAccount,
  removeAccount,
  requestPairingCode,
  syncAccountContactsAction,
  type ActionState,
} from './actions'
import { PairingPanel } from './pairing-panel'
import { QrPanel } from './qr-panel'

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
              return current.filter((account) => account.id !== removedId)
            }

            const next = payload.new as AccountView
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

      if (!cancelled && data) setAccounts(data as AccountView[])
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

  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null)

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !accounts.some((account) => account.id === selectedId)) {
      setSelectedId(accounts[0]!.id)
    }
  }, [accounts, selectedId])

  const selected = accounts.find((account) => account.id === selectedId) ?? null

  return (
    <div className="space-y-2.5">
      <div className="grid gap-2.5 sm:grid-cols-3">
        <Card lift className="border-ok/30 bg-ok-soft/50">
          <div className="p-3.5">
            <p className="text-[11.5px] font-medium text-ok-dim">Bağlı hat</p>
            <p className="mt-1 tabular text-[28px] font-extrabold tracking-[-0.03em] text-ok-dim">
              {connected}
            </p>
            <p className="mt-1 text-[11.5px] text-ink-muted">{accounts.length} toplam kayıt</p>
          </div>
        </Card>
        <Card lift className="border-accent/25 bg-accent-soft/70">
          <div className="p-3.5">
            <p className="text-[11.5px] font-medium text-accent-dim">Bugün gönderilen</p>
            <p className="mt-1 tabular text-[28px] font-extrabold tracking-[-0.03em] text-accent">
              {sentTodayTotal}
            </p>
            <p className="mt-1 text-[11.5px] text-ink-muted">Tüm hatlar toplamı</p>
          </div>
        </Card>
        <Card lift className={atCap ? 'border-warn/35 bg-[#fff6e8]' : 'border-hairline bg-surface'}>
          <div className="p-3.5">
            <p className="text-[11.5px] font-medium text-ink-muted">Kota</p>
            <p className="mt-1 tabular text-[28px] font-extrabold tracking-[-0.03em] text-ink">
              {accounts.length}
              <span className="text-[16px] font-semibold text-ink-muted"> / {accountsQuota}</span>
            </p>
            <div className="mt-2.5">
              <Meter value={accounts.length} max={accountsQuota} tone={atCap ? 'warn' : 'accent'} />
            </div>
            <p className="mt-1.5 text-[11.5px] text-ink-faint">{remaining} ekleme hakkı</p>
          </div>
        </Card>
      </div>

      <NewAccountForm remaining={remaining} atCap={atCap} />

      {accounts.length === 0 ? (
        <Card lift className="border-accent/20 bg-accent-soft/40">
          <EmptyState
            tone="phone"
            title="Henüz hat yok"
            description="Yukarıdan bir etiket verip hat ekleyin. QR veya telefon eşleştirme kodu bu ekranda otomatik gelir; okuttuğunuzda bağlantı kurulur."
            action={<AccentLink href="#yeni-hat">Yukarıdan hat ekle</AccentLink>}
          />
        </Card>
      ) : (
        <SplitPane
          list={
            <div className="flex min-h-0 flex-col">
              <CardHeader
                title="Hatlar"
                subtitle={`${accounts.length} kayıt · seçince QR / işlemler`}
              />
              <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
                {accounts.map((account, index) => {
                  const active = account.id === selectedId
                  return (
                    <li
                      key={account.id}
                      className="wb-row-enter"
                      style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(account.id)}
                        className={`wb-list-row flex w-full items-start gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? 'border-accent/25 bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent)]'
                            : 'border-transparent hover:bg-surface-raised'
                        }`}
                      >
                        <span
                          className={`mt-1.5 inline-flex size-2 shrink-0 rounded-full ${
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
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-ink">{account.label}</p>
                          <p className="mt-0.5 truncate font-mono text-[11.5px] text-ink-muted tabular">
                            {account.phone_e164 ?? 'Numara yok'}
                          </p>
                          <div className="mt-1">
                            <StatusPill status={account.is_locked ? 'banned' : account.status} />
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          }
          detail={
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {selected ? (
                <AccountCard key={selected.id} account={selected} canManage={canManage} />
              ) : (
                <EmptyState
                  tone="phone"
                  title="Hat seçin"
                  description="Soldan bir hat seçerek QR, kota ve işlemleri görün."
                />
              )}
            </div>
          }
        />
      )}
    </div>
  )
}

function NewAccountForm({ remaining, atCap }: { remaining: number; atCap: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createAccount,
    null,
  )
  const toast = useToast()
  useSyncBusy(pending, 'Hat ekleniyor…')
  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) toast(state.ok, 'success')
  }, [state?.error, state?.ok, toast])

  return (
    <Card>
      <form id="yeni-hat" action={formAction} className="flex flex-wrap items-end gap-2.5 p-3.5 scroll-mt-6">
        <div className="min-w-[220px] flex-1">
          <Field
            label="Yeni hat ekle"
            hint={
              atCap
                ? 'Kota dolu. Yer açmak için aşağıdan kullanılmayan bir hattı silin.'
                : `Hat için kısa bir ad verin (ör. Satış 2, Destek). Kalan hak: ${remaining}`
            }
          >
            <Input
              name="label"
              placeholder="Satış hattı 2"
              required
              disabled={atCap || pending}
            />
          </Field>
        </div>
        <Button type="submit" variant="accent" disabled={pending || atCap}>
          {pending ? 'Oluşturuluyor…' : atCap ? 'Kota dolu' : 'Hat ekle'}
        </Button>

        {state?.error ? (
          <div className="w-full">
            <Notice tone="danger">{state.error}</Notice>
          </div>
        ) : null}
        {state?.ok ? (
          <div className="w-full">
            <Notice tone="accent">{state.ok}</Notice>
          </div>
        ) : null}
      </form>
    </Card>
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
      ? 'border-danger/35 bg-[#fff5f4] shadow-[0_8px_24px_rgba(180,35,24,0.06)]'
      : account.status === 'connected'
        ? 'border-ok/40 bg-ok-soft/35 shadow-[0_8px_24px_rgba(37,211,102,0.08)]'
        : account.status === 'qr' || account.status === 'connecting'
          ? 'border-[#e8a317]/45 bg-[#fff8e8] shadow-[0_8px_24px_rgba(161,92,0,0.06)]'
          : 'border-hairline bg-surface'

  return (
    <Card lift className={shell}>
      <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-hairline/80 px-3.5 py-3">
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

        <div className="flex flex-wrap gap-1.5">
          {account.status === 'connected' ? (
            <>
              <Button
                variant="accent"
                onClick={() => {
                  run(
                    () => syncAccountContactsAction(account.id),
                    'Rehber içe aktarma kuyruğa alındı. WhatsApp senkronu ~1 dk sürebilir; sonra Kişiler’de görünür.',
                  )
                }}
                disabled={pending}
                title="Hatta kayıtlı WhatsApp rehberini ve sohbet kişilerini yeni bir liste olarak aktarır"
              >
                Rehberi içe aktar
              </Button>
              <Button
                onClick={() => run(() => disconnectAccount(account.id))}
                disabled={pending}
                title="Oturumu bu sunucuda kapatır; WhatsApp'tan cihaz silinmez"
              >
                Bağlantıyı kes
              </Button>
            </>
          ) : (
            <Button
              variant="accent"
              onClick={() => run(() => connectAccount(account.id))}
              disabled={pending || account.is_locked}
              title="QR veya eşleştirme kodunu yeniler"
            >
              Yeniden bağla
            </Button>
          )}

          <Button
            onClick={() => {
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
            disabled={pending}
            title="Telefondaki bağlı cihazlardan kaldırır"
          >
            WhatsApp’tan çıkar
          </Button>

          {canManage ? (
            <Button
              variant="danger"
              onClick={() => {
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
              disabled={pending}
            >
              {t('common.delete')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2.5 p-3.5">
        {account.is_locked && account.lock_reason ? (
          <Notice tone="danger">
            <span className="font-medium">Hesap kilitli.</span> {account.lock_reason}
            <br />
            Bu hesapla gönderim yapılmıyor ve bağlı kampanyalar durduruldu.
          </Notice>
        ) : null}

        {account.status !== 'connected' && !account.is_locked ? (
          <PairingSection account={account} />
        ) : null}

        {account.status === 'connected' && !account.is_locked ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Notice tone="accent">
              Hat bağlı ve gönderime hazır. Tek seferlik mesaj için hızlı gönderim;
              listeden planlı gönderim için kampanya kullanın.
            </Notice>
            <div className="flex shrink-0 flex-wrap gap-2">
              <AccentLink href="/hizli-gonderim">Hızlı gönderim</AccentLink>
              <QuietLink href="/kampanyalar">Kampanya</QuietLink>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[11.5px] text-ink-muted">Bugün gönderilen</span>
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
              <p className="mt-1 text-[11px] text-ink-faint">
                Isınma: paket limiti {account.daily_send_limit}, bugünkü tavan {dayCap}.
              </p>
            ) : null}
          </div>

          {/*
            WhatsApp'in bildirdigi gercek "yeni sohbet" butcesi.
            Bu tukendiginde 463 reach-out time-lock geliyor, yani gonderime
            devam etmek hesabi kisitlatiyor. Tahmin degil, sunucudan gelen deger.
          */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[11.5px] text-ink-muted">
                WhatsApp yeni sohbet kotası
              </span>
              <span className="text-[11.5px] text-ink tabular">
                {quotaKnown ? `${quotaUsed} / ${quotaTotal}` : 'Bilinmiyor'}
              </span>
            </div>
            <Meter
              value={quotaUsed ?? 0}
              max={quotaTotal ?? 1}
              tone={quotaTight ? 'danger' : 'accent'}
            />
            {!quotaKnown ? (
              <p className="mt-1 text-[11px] text-ink-faint">
                Hesap bağlandığında WhatsApp&apos;tan okunur.
              </p>
            ) : null}
          </div>
        </div>

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
