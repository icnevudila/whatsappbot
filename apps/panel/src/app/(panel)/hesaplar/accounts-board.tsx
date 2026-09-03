'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import type { Tables } from '@wa/shared'
import { Button, Card, Field, Input, Meter, Notice, StatusPill } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useServerSyncedState } from '@/lib/use-server-synced-state'
import {
  connectAccount,
  createAccount,
  disconnectAccount,
  logoutAccount,
  removeAccount,
  requestPairingCode,
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
  | 'new_chat_quota_total'
  | 'new_chat_quota_used'
  | 'reachout_locked_until'
>

export function AccountsBoard({
  initial,
  userId,
}: {
  initial: AccountView[]
  userId: string
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
          filter: `owner_id=eq.${userId}`,
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
  }, [userId, setAccounts])

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
          'id, label, phone_e164, status, status_detail, enabled, is_locked, lock_reason, qr_code, qr_expires_at, pairing_code, pairing_expires_at, daily_send_limit, sent_today, sent_today_on, new_chat_quota_total, new_chat_quota_used, reachout_locked_until',
        )
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
  }, [waiting, setAccounts])

  return (
    <div className="space-y-4">
      <NewAccountForm />

      {accounts.length === 0 ? (
        <Card>
          <div className="px-6 py-12 text-center">
            <p className="text-[13px] font-medium">Henuz hesap yok</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-ink-muted">
              Yukaridan bir hesap olusturun. QR kodu bu ekranda kendiliginden gorunur,
              telefonunuzdan okuttugunuzda baglanti kurulur.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  )
}

function NewAccountForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createAccount,
    null,
  )

  return (
    <Card>
      <form action={formAction} className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <Field label="Yeni hesap" hint="Hangi numara oldugunu hatirlatacak bir ad.">
            <Input name="label" placeholder="Satis hatti 1" required />
          </Field>
        </div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? 'Olusturuluyor...' : 'Hesap ekle'}
        </Button>

        {state?.error ? (
          <div className="w-full">
            <Notice tone="danger">{state.error}</Notice>
          </div>
        ) : null}
      </form>
    </Card>
  )
}

function AccountCard({ account }: { account: AccountView }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const run = (action: () => Promise<ActionState>) => {
    setMessage(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) setMessage(result.error)
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  const sentToday = account.sent_today_on === today ? account.sent_today : 0

  const quotaTotal = account.new_chat_quota_total
  const quotaUsed = account.new_chat_quota_used
  const quotaKnown = quotaTotal !== null && quotaUsed !== null
  const quotaTight = quotaKnown && quotaUsed / Math.max(1, quotaTotal) > 0.8

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[13.5px] font-semibold">{account.label}</h3>
            <StatusPill status={account.is_locked ? 'banned' : account.status} />
          </div>
          <p className="mt-0.5 text-[12px] text-ink-muted tabular">
            {account.phone_e164 ?? 'Numara henuz bilinmiyor'}
            {account.status_detail ? ` · ${account.status_detail}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {account.status === 'connected' ? (
            <Button
              onClick={() => run(() => disconnectAccount(account.id))}
              disabled={pending}
            >
              Kapat
            </Button>
          ) : (
            <Button
              variant="accent"
              onClick={() => run(() => connectAccount(account.id))}
              disabled={pending || account.is_locked}
            >
              Bagla
            </Button>
          )}

          <Button onClick={() => run(() => logoutAccount(account.id))} disabled={pending}>
            Cikis
          </Button>

          <Button
            variant="danger"
            onClick={() => run(() => removeAccount(account.id))}
            disabled={pending}
          >
            Sil
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {account.is_locked && account.lock_reason ? (
          <Notice tone="danger">
            <span className="font-medium">Hesap kilitli.</span> {account.lock_reason}
            <br />
            Bu hesapla gonderim yapilmiyor ve bagli kampanyalar durduruldu.
          </Notice>
        ) : null}

        {account.status !== 'connected' && !account.is_locked ? (
          <PairingSection account={account} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[11.5px] text-ink-muted">Bugun gonderilen</span>
              <span className="text-[11.5px] text-ink tabular">
                {sentToday} / {account.daily_send_limit}
              </span>
            </div>
            <Meter
              value={sentToday}
              max={account.daily_send_limit}
              tone={sentToday >= account.daily_send_limit ? 'warn' : 'accent'}
            />
          </div>

          {/*
            WhatsApp'in bildirdigi gercek "yeni sohbet" butcesi.
            Bu tukendiginde 463 reach-out time-lock geliyor, yani gonderime
            devam etmek hesabi kisitlatiyor. Tahmin degil, sunucudan gelen deger.
          */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[11.5px] text-ink-muted">
                WhatsApp yeni sohbet kotasi
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
                Hesap baglandiginda WhatsApp&apos;tan okunur.
              </p>
            ) : null}
          </div>
        </div>

        {account.reachout_locked_until &&
        new Date(account.reachout_locked_until) > new Date() ? (
          <Notice tone="danger">
            Reach-out time-lock aktif. {new Date(account.reachout_locked_until).toLocaleString('tr-TR')}{' '}
            tarihine kadar tanimadigi kisilere gonderim yapilamaz.
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

  const ask = () => {
    setError(null)
    startTransition(async () => {
      const result = await requestPairingCode(account.id, phone)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-md border border-hairline bg-canvas p-0.5">
        {(
          [
            ['qr', 'QR ile bagla'],
            ['code', 'Telefon numarasiyla bagla'],
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
          <p className="rounded-md border border-hairline bg-canvas px-4 py-6 text-center text-[12.5px] text-ink-muted">
            {account.status === 'qr_pending' || account.status === 'connecting'
              ? 'QR kodu hazirlaniyor...'
              : 'QR kodu icin "Bagla" dugmesine basin.'}
          </p>
        )
      ) : account.pairing_code ? (
        <PairingPanel
          code={account.pairing_code}
          expiresAt={account.pairing_expires_at}
        />
      ) : (
        <div className="rounded-md border border-hairline bg-canvas p-4">
          <Field
            label="Baglanacak WhatsApp numarasi"
            hint="Ulke koduyla yazin. Ornek: +90 532 123 45 67"
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
            disabled={pending || phone.trim().length < 10}
            className="mt-3"
          >
            {pending ? 'Kod isteniyor...' : 'Kod al'}
          </Button>

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
