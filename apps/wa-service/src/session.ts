import {
  Browsers,
  DisconnectReason,
  isJidBroadcast,
  isJidNewsletter,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  makeWASocket,
  type AnyMessageContent,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys'
import NodeCache from 'node-cache'
import { jidToE164, toE164, type AccountStatus } from '@wa/shared'
import { createAuthHandle, type AuthHandle } from './auth-store.js'
import { logAccountEvent, patchAccount, type AccountRow } from './accounts.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { readLeaseHolder, releaseLease, renewLease } from './lease.js'
import { lookupSentMessage, rememberSentMessage } from './sent-messages.js'
import { resolveWaVersion } from './wa-version.js'

/** Undocumented: enum'da yok ama geliyor. Tanimadigi kisilere gonderim kisiti. */
const REACH_OUT_TIME_LOCK = 463

const MAX_QR_ATTEMPTS = 30
const REPLACED_WINDOW_MS = 30_000
const REPLACED_LIMIT = 5
const REPLACED_COOLDOWN_MS = 30_000

/**
 * Baileys 7'de gelen kota / time-lock API'leri 6.7'de yok.
 * QR baglantisi rc14'te 401 verdigi icin 6.7'deyiz; bu cagrilar varsa kullanilir.
 */
type ExtendedWaSocket = WASocket & {
  fetchNewChatMessageCap?: () => Promise<{
    total_quota?: number
    used_quota?: number
    cycle_end_timestamp?: string
  } | null>
  fetchAccountReachoutTimelock?: () => Promise<{
    isActive?: boolean
    timeEnforcementEnds?: number | string
    enforcementType?: string
  } | null>
}

export type SessionOutcome = 'closed' | 'handed-over' | 'locked' | 'logged-out'

type Timer = ReturnType<typeof setInterval>

function backoffMs(attempt: number): number {
  const base = Math.min(30_000, 2 ** Math.min(attempt, 5) * 1_000)
  return base + Math.floor(Math.random() * 1_000)
}

/** Baileys icindeki zaman asimsiz mutex yuzunden her gonderim ust sinirli. */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} ${ms} ms icinde tamamlanmadi`)),
          ms,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export class WhatsAppSession {
  readonly accountId: string
  readonly ownerId: string

  private readonly log
  private readonly epoch: number

  private sock: ExtendedWaSocket | undefined
  private auth: AuthHandle | undefined
  private heartbeat: Timer | undefined

  private status: AccountStatus = 'disconnected'
  private qrAttempts = 0
  private reconnectAttempts = 0
  private replacedTimestamps: number[] = []

  /** Kapanis baslamissa yeni is kabul edilmez ve yeniden baglanma denenmez. */
  private shuttingDown = false
  private disposed = false

  /**
   * startSock disinda tutuluyor ki restart'i assin. Icine tasinirsa her
   * yeniden baglanmada tekrar sifirlanir ve retry sayaci ise yaramaz.
   */
  private readonly msgRetryCounterCache = new NodeCache({ stdTTL: 300, useClones: false })

  /**
   * Ayni gorseli her alici icin tekrar tekrar yuklemeyi onler.
   * Yalnizca medya { url } biciminde verildiginde calisir; Buffer veya
   * { stream } verilirse onbellek anahtari olusmuyor.
   * Hesap basina ayri: yuklenen medya tanitici o hesaba ait.
   */
  private readonly mediaCache = new NodeCache({ stdTTL: 3_600, useClones: false })

  private onClosed: ((outcome: SessionOutcome) => void) | undefined

  /**
   * requestPairingCode ancak soket WhatsApp ile el sikismasini bitirdikten
   * sonra calisiyor; daha erken cagrilirsa sessizce hata veriyor. Ilk 'qr'
   * olayi bunun gozlenebilir tek isareti: sunucu ref gonderdi demek.
   * Her openSocket'te yenileniyor, cunku yeniden baglanmada el sikisma bastan
   * yapiliyor.
   */
  private pairingReady: Promise<void> = Promise.resolve()
  private markPairingReady: (() => void) | undefined

  /** Kod isteyen numara; 515 restart sonrasi kodu tekrar istemek icin. */
  private pairingPhone: string | undefined

  constructor(account: Pick<AccountRow, 'id' | 'owner_id'>, epoch: number) {
    this.accountId = account.id
    this.ownerId = account.owner_id
    this.epoch = epoch
    this.log = logger.child({ accountId: account.id, scope: 'session' })
  }

  get currentStatus(): AccountStatus {
    return this.status
  }

  /** Socket gercekten canli mi? Health check bunu beklenen sayiyla karsilastirir. */
  get isLive(): boolean {
    return this.status === 'connected' && this.sock?.ws?.isOpen === true
  }

  onClose(handler: (outcome: SessionOutcome) => void): void {
    this.onClosed = handler
  }

  async start(): Promise<void> {
    if (this.disposed) throw new Error('Kapatilmis oturum yeniden baslatilamaz')

    this.auth = await createAuthHandle(this.accountId, this.epoch)
    await this.openSocket()
    this.startHeartbeat()
  }

  private async openSocket(): Promise<void> {
    const auth = this.auth
    if (!auth) throw new Error('Auth handle hazir degil')

    const version = await resolveWaVersion()
    await this.setStatus('connecting')

    this.pairingReady = new Promise<void>((resolve) => {
      this.markPairingReady = resolve
    })

    this.sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: {
        creds: auth.state.creds,
        // Yalnizca cache katmani. addTransactionCapability elle sarilmiyor;
        // makeWASocket bunu kendi icinde uyguluyor.
        keys: makeCacheableSignalKeyStore(auth.state.keys, this.log),
      },
      logger: this.log,
      browser: Browsers.macOS('Chrome'),
      // Telefonda bildirim kalsin; "online" isaretlemek bildirimleri yutuyor.
      markOnlineOnConnect: false,
      // 100 oturumda tam gecmis senkronu RAM'i patlatir.
      syncFullHistory: false,
      msgRetryCounterCache: this.msgRetryCounterCache,
      mediaCache: this.mediaCache,
      getMessage: (key) => lookupSentMessage(this.accountId, key),
      shouldIgnoreJid: (jid) => Boolean(isJidBroadcast(jid) || isJidNewsletter(jid)),
    })

    this.sock.ev.on('creds.update', () => {
      void auth.saveCreds().catch((error) => {
        this.log.error({ err: error }, 'saveCreds basarisiz')
      })
    })

    this.sock.ev.on('connection.update', (update) => {
      void this.handleConnectionUpdate(update).catch((error) => {
        this.log.error({ err: error }, 'connection.update islenirken hata')
      })
    })

    // WhatsApp'in gercek "yeni sohbet mesaj kotasi" (Baileys 7+).
    // 6.7'de olay yok; dinleyiciyi yalnizca destekleniyorsa bagliyoruz.
    const events = this.sock.ev as unknown as {
      on: (event: string, listener: (info: unknown) => void) => void
    }
    events.on('message-capping.update', (info) => {
      void this.persistQuota(
        (info ?? {}) as {
          total_quota?: number
          used_quota?: number
          cycle_end_timestamp?: string
        },
      ).catch((error) => {
        this.log.warn({ err: error }, 'Kota bilgisi yazilamadi')
      })
    })
  }

  private async handleConnectionUpdate(update: {
    connection?: string
    qr?: string
    lastDisconnect?: { error?: Error | undefined } | undefined
  }): Promise<void> {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      this.qrAttempts += 1
      this.log.info({ attempt: this.qrAttempts }, 'QR uretildi')

      // Soket artik eslestirme kodu isteyebilecek durumda.
      this.markPairingReady?.()

      // Kod ile eslesme secildiyse QR yazmiyoruz: ikisini birden gostermek
      // kullaniciyi bolerdi ve kod hala gecerliyken QR onu ezerdi.
      if (this.pairingPhone) {
        this.status = 'qr_pending'
        return
      }

      await patchAccount(this.accountId, {
        status: 'qr_pending',
        qr_code: qr,
        // Baileys QR'i 60 saniyede bir yeniler.
        qr_expires_at: new Date(Date.now() + 60_000).toISOString(),
        pairing_code: null,
        pairing_expires_at: null,
        status_detail: `QR bekleniyor (${this.qrAttempts}/${MAX_QR_ATTEMPTS})`,
      })
      this.status = 'qr_pending'

      if (this.qrAttempts > MAX_QR_ATTEMPTS) {
        this.log.warn('QR denemeleri tukendi, oturum kapatiliyor')
        await this.giveUpOnPairing()
      }
      return
    }

    if (connection === 'open') {
      this.qrAttempts = 0
      this.reconnectAttempts = 0
      this.pairingPhone = undefined

      const jid = this.sock?.user?.id
      const normalized = jid ? jidNormalizedUser(jid) : null
      const phone = normalized ? jidToE164(normalized) : null

      await patchAccount(this.accountId, {
        status: 'connected',
        status_detail: null,
        qr_code: null,
        qr_expires_at: null,
        pairing_code: null,
        pairing_expires_at: null,
        wa_jid: normalized,
        wa_lid: (this.sock?.user as { lid?: string } | undefined)?.lid ?? null,
        phone_e164: phone,
        connected_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        last_disconnect_code: null,
      })
      this.status = 'connected'

      await this.ensureWarmupStarted()
      await this.refreshQuota()

      // 515 restart sonrasi pairingPhone korunuyordu; open'da sifirlandi.
      // Baglanti tamamlandiysa kod gerekmez.
      await logAccountEvent(this, 'info', 'account.connected', { jid: normalized, phone })
      this.log.info({ jid: normalized, phone }, 'Hesap bagli')
      return
    }

    if (connection === 'close') {
      await this.handleClose(lastDisconnect?.error)
    }
  }

  private async handleClose(error: Error | undefined): Promise<void> {
    const code = extractStatusCode(error)
    await patchAccount(this.accountId, { last_disconnect_code: code ?? null })

    if (this.shuttingDown) {
      this.log.info({ code }, 'Kapanis sirasinda baglanti kapandi')
      return
    }

    this.log.warn({ code, err: error }, 'Baglanti kapandi')

    switch (code) {
      case DisconnectReason.loggedOut: {
        // Gercek logout. Auth silinecek tek durumlardan biri.
        await logAccountEvent(this, 'warn', 'account.logged_out', { code })
        await this.auth?.clear()
        await patchAccount(this.accountId, {
          status: 'logged_out',
          status_detail: 'Telefondan cikis yapildi, yeni QR gerekiyor',
          qr_code: null,
          wa_jid: null,
          wa_lid: null,
        })
        this.status = 'logged_out'
        await this.finish('logged-out')
        return
      }

      case DisconnectReason.forbidden: {
        await this.lockAndFinish('403 forbidden: hesap WhatsApp tarafindan kisitlandi')
        return
      }

      case REACH_OUT_TIME_LOCK: {
        // Aradigimiz ban mekanizmasinin somut tetikleyicisi.
        await this.captureReachoutTimelock()
        await this.lockAndFinish(
          '463 reach-out time-lock: tanimadigi kisilere gonderim kisiti',
        )
        return
      }

      case DisconnectReason.multideviceMismatch: {
        // Yeniden baglanmak faydasiz, surum uyumsuzlugu.
        await patchAccount(this.accountId, {
          status: 'error',
          status_detail: '411 multidevice mismatch: WA Web surumu uyumsuz',
        })
        this.status = 'error'
        await logAccountEvent(this, 'error', 'account.version_mismatch', { code })
        await this.finish('closed')
        return
      }

      case DisconnectReason.connectionReplaced: {
        await this.handleReplaced()
        return
      }

      case DisconnectReason.restartRequired: {
        // QR / pairing sonrasi normal akis: derhal yeniden ac.
        // pairingPhone korunur; reopen sonrasi kod yenilenir.
        this.log.info('515 restart required, socket yeniden aciliyor')
        await this.reopen(0)
        return
      }

      case DisconnectReason.badSession: {
        await logAccountEvent(this, 'warn', 'account.bad_session', { code })
        await this.reopen(backoffMs(this.reconnectAttempts++))
        return
      }

      case DisconnectReason.unavailableService: {
        await this.reopen(Math.max(15_000, backoffMs(this.reconnectAttempts++)))
        return
      }

      // 408 hem timedOut hem connectionLost; sayisal olarak ayirt edilemezler.
      case DisconnectReason.timedOut:
      case DisconnectReason.connectionClosed:
      default: {
        // Enum'da olmayan kodlar geliyor, bu yuzden default dali sart.
        await this.reopen(backoffMs(this.reconnectAttempts++))
        return
      }
    }
  }

  /** 440: kirayi kontrol et, geri calma. */
  private async handleReplaced(): Promise<void> {
    const now = Date.now()
    this.replacedTimestamps = [
      ...this.replacedTimestamps.filter((t) => now - t < REPLACED_WINDOW_MS),
      now,
    ]

    await logAccountEvent(this, 'warn', 'account.connection_replaced', {
      recentCount: this.replacedTimestamps.length,
    })

    let holder: string | null = null
    try {
      holder = await readLeaseHolder(this.accountId)
    } catch (error) {
      // Kira okunamadiysa geri calmaktan kacinmak icin devrediyoruz.
      this.log.warn({ err: error }, 'Kira okunamadi, oturum devredildi sayiliyor')
      await this.finish('handed-over')
      return
    }

    if (holder && holder !== env.workerId) {
      this.log.warn({ holder }, 'Kira baskasinda, oturum devredildi')
      await patchAccount(this.accountId, {
        status: 'disconnected',
        status_detail: 'Oturum baska bir process tarafindan devraldi',
      })
      await this.finish('handed-over')
      return
    }

    // Emniyet valfi: kisa surede cok fazla 440 gorursek bekle.
    if (this.replacedTimestamps.length >= REPLACED_LIMIT) {
      this.log.error('440 dongusu tespit edildi, bekleme moduna geciliyor')
      await patchAccount(this.accountId, {
        status: 'error',
        status_detail: 'connectionReplaced dongusu, 30 saniye bekleniyor',
      })
      this.replacedTimestamps = []
      await this.reopen(REPLACED_COOLDOWN_MS)
      return
    }

    await this.reopen(backoffMs(this.reconnectAttempts++))
  }

  private async reopen(delayMs: number): Promise<void> {
    if (this.shuttingDown || this.disposed) return

    await patchAccount(this.accountId, { status: 'connecting' })
    this.status = 'connecting'

    const savedPairingPhone = this.pairingPhone

    setTimeout(() => {
      if (this.shuttingDown || this.disposed) return
      void (async () => {
        try {
          await this.closeSocketQuietly()
          await this.openSocket()

          // 515 sonrasi pairing kodu yenilenmezse panelde bayat kod kalir.
          if (savedPairingPhone && !this.auth?.state.creds.registered) {
            this.pairingPhone = savedPairingPhone
            try {
              await this.requestPairingCode(`+${savedPairingPhone}`)
            } catch (error) {
              this.log.warn({ err: error }, 'Pairing kodu yenilenemedi')
            }
          }
        } catch (error) {
          this.log.error({ err: error }, 'Yeniden baglanma basarisiz')
          void this.reopen(backoffMs(this.reconnectAttempts++))
        }
      })()
    }, delayMs)
  }

  /** Eski socket listener birikimini onlemek icin sessiz kapatma. */
  private async closeSocketQuietly(): Promise<void> {
    const sock = this.sock
    this.sock = undefined
    if (!sock) return

    try {
      sock.ev.removeAllListeners('connection.update')
      sock.ev.removeAllListeners('creds.update')
    } catch {
      // ignore
    }

    try {
      sock.end(undefined)
    } catch {
      // ignore
    }
  }

  private async lockAndFinish(reason: string): Promise<void> {
    const { lockAccount } = await import('./accounts.js')
    await lockAccount(this, reason)
    await patchAccount(this.accountId, { status: 'banned', status_detail: reason })
    this.status = 'banned'
    await this.finish('locked')
  }

  /**
   * QR yerine telefona 8 haneli kod gonderir.
   *
   * WhatsApp bu kodu yalnizca hic eslesmemis bir soket icin veriyor ve
   * numaranin ulke kodu dahil, isaret ve bosluk olmadan verilmesi gerekiyor.
   * Kod ~3 dakika gecerli; kullanici telefonda
   * Baglantili cihazlar -> Cihaz bagla -> Telefon numarasiyla bagla
   * yolunu izleyip giriyor.
   */
  async requestPairingCode(phone: string): Promise<string> {
    if (this.shuttingDown || this.disposed) {
      throw new Error('Oturum kapaniyor, kod istenemez')
    }

    const e164 = toE164(phone)
    if (!e164) {
      throw new Error('Gecerli telefon numarasi degil (ulke koduyla yazin)')
    }
    const digits = e164.replace(/\D/g, '')

    if (this.auth?.state.creds.registered) {
      throw new Error('Bu hat zaten eslesmis, once cikis yapin')
    }

    // Numarayi onceden isaretliyoruz: bundan sonra gelen qr olaylari
    // ekrandaki kodu ezmesin.
    this.pairingPhone = digits

    await withTimeout(this.pairingReady, 40_000, 'soket eslestirmeye hazirlanma')

    const sock = this.sock
    if (!sock) throw new Error('Soket yok')

    const code = await withTimeout(
      sock.requestPairingCode(digits),
      30_000,
      'requestPairingCode',
    )

    const expiresAt = new Date(Date.now() + 180_000).toISOString()

    await patchAccount(this.accountId, {
      status: 'qr_pending',
      pairing_code: code,
      pairing_expires_at: expiresAt,
      // QR'i temizliyoruz ki panel kodu gostersin.
      qr_code: null,
      qr_expires_at: null,
      status_detail: 'Eslestirme kodu telefona girilmeyi bekliyor',
    })
    this.status = 'qr_pending'

    this.log.info({ phone: digits }, 'Eslestirme kodu uretildi')
    await logAccountEvent(this, 'info', 'account.pairing_code', { phone: digits })

    return code
  }

  private async giveUpOnPairing(): Promise<void> {
    // QR denemeleri tukendi: auth silinecek diger durum.
    // Yalnizca hic eslesmemis hesaplarda; eslesmis bir hesabin kimligini
    // QR zaman asimi yuzunden silmek onu bosuna yeniden QR'a zorlar.
    if (this.auth && !this.auth.state.creds.registered) {
      await this.auth.clear()
    }

    this.pairingPhone = undefined

    await patchAccount(this.accountId, {
      status: 'disconnected',
      status_detail: 'QR okutulmadi, tekrar deneyin',
      qr_code: null,
      qr_expires_at: null,
      pairing_code: null,
      pairing_expires_at: null,
    })
    this.status = 'disconnected'
    await logAccountEvent(this, 'warn', 'account.qr_expired', {})
    await this.finish('closed')
  }

  private startHeartbeat(): void {
    const intervalMs = Math.max(5_000, (env.leaseTtlSeconds * 1_000) / 3)

    this.heartbeat = setInterval(() => {
      void (async () => {
        if (this.shuttingDown || this.disposed) return

        try {
          const stillOurs = await renewLease(this.accountId, this.epoch)
          if (!stillOurs) {
            this.log.warn('Kira artik bizim degil, socket birakiliyor')
            await this.finish('handed-over')
            return
          }
        } catch (error) {
          // Veritabanina ulasilamiyor. Socket ATILMAZ.
          this.log.warn({ err: error }, 'Kira yenilenemedi, socket korunuyor')
          return
        }

        if (this.status === 'connected') {
          await patchAccount(this.accountId, { last_seen_at: new Date().toISOString() })
        }
      })()
    }, intervalMs)
  }

  private async ensureWarmupStarted(): Promise<void> {
    await import('./db.js').then(({ query }) =>
      query(
        `update public.accounts
            set warmup_started_at = coalesce(warmup_started_at, now())
          where id = $1`,
        [this.accountId],
      ),
    )
  }

  private async persistQuota(info: {
    total_quota?: number
    used_quota?: number
    cycle_end_timestamp?: string
  }): Promise<void> {
    const cycleEnd = parseTimestamp(info.cycle_end_timestamp)

    await patchAccount(this.accountId, {
      new_chat_quota_total: info.total_quota ?? null,
      new_chat_quota_used: info.used_quota ?? null,
      new_chat_quota_cycle_end: cycleEnd,
    })

    this.log.info(
      { total: info.total_quota, used: info.used_quota },
      'Yeni sohbet kotasi guncellendi',
    )
  }

  /** Baglanmadan sonra kotayi ve time-lock durumunu sunucudan sorar. */
  private async refreshQuota(): Promise<void> {
    const sock = this.sock
    if (!sock) return

    if (typeof sock.fetchNewChatMessageCap === 'function') {
      try {
        const cap = await withTimeout(
          sock.fetchNewChatMessageCap(),
          15_000,
          'Kota sorgusu',
        )
        await this.persistQuota(cap ?? {})
      } catch (error) {
        this.log.debug({ err: error }, 'Kota sorgusu basarisiz')
      }
    }

    await this.captureReachoutTimelock()
  }

  private async captureReachoutTimelock(): Promise<void> {
    const sock = this.sock
    if (!sock || typeof sock.fetchAccountReachoutTimelock !== 'function') return

    try {
      const lock = await withTimeout(
        sock.fetchAccountReachoutTimelock(),
        15_000,
        'Time-lock sorgusu',
      )

      if (lock?.isActive) {
        await patchAccount(this.accountId, {
          reachout_locked_until: lock.timeEnforcementEnds
            ? new Date(lock.timeEnforcementEnds).toISOString()
            : null,
          reachout_lock_type: lock.enforcementType ?? null,
        })
        await logAccountEvent(this, 'warn', 'account.reachout_timelock', {
          until: lock.timeEnforcementEnds,
          type: lock.enforcementType,
        })
      } else {
        await patchAccount(this.accountId, {
          reachout_locked_until: null,
          reachout_lock_type: null,
        })
      }
    } catch (error) {
      this.log.debug({ err: error }, 'Time-lock sorgusu basarisiz')
    }
  }

  /**
   * onWhatsApp gonderim yolunda zorunlu kapi, istege bagli bir dogrulama degil:
   * kayitli olmayan bir numaraya mesaj denemek hesap seviyesinde kisit tetikliyor.
   */
  async verifyNumbers(
    phones: string[],
  ): Promise<Map<string, { exists: boolean; jid: string | null }>> {
    const result = new Map<string, { exists: boolean; jid: string | null }>()
    const sock = this.sock
    if (!sock || !this.isLive || phones.length === 0) return result

    const response = await withTimeout(
      sock.onWhatsApp(...phones),
      env.sendTimeoutMs,
      'onWhatsApp',
    )

    for (const [index, phone] of phones.entries()) {
      const entry = response?.[index]
      result.set(phone, {
        exists: entry?.exists === true,
        jid: entry?.jid ?? null,
      })
    }

    return result
  }

  async sendMessage(jid: string, content: AnyMessageContent): Promise<WAMessage> {
    const sock = this.sock
    if (!sock || !this.isLive) {
      throw new Error(`Hesap bagli degil (durum: ${this.status})`)
    }

    const message = await withTimeout(
      sock.sendMessage(jid, content),
      env.sendTimeoutMs,
      'sendMessage',
    )

    if (!message) throw new Error('WhatsApp mesaj kimligi dondurmedi')

    await rememberSentMessage(this.accountId, message)
    return message
  }

  /** Kullanicinin acik logout istegi. sock.logout() yalnizca burada cagrilir. */
  async logout(): Promise<void> {
    this.shuttingDown = true
    this.stopHeartbeat()

    try {
      await withTimeout(this.sock?.logout() ?? Promise.resolve(), 15_000, 'logout')
    } catch (error) {
      this.log.warn({ err: error }, 'logout cagrisi basarisiz, yerel temizlik yapiliyor')
    }

    await this.auth?.clear()
    await patchAccount(this.accountId, {
      status: 'logged_out',
      status_detail: 'Panelden cikis yapildi',
      qr_code: null,
      wa_jid: null,
      wa_lid: null,
      phone_e164: null,
    })
    await logAccountEvent(this, 'info', 'account.logout_requested', {})
    await this.finish('logged-out')
  }

  /**
   * Temiz kapanis. Sira kritik:
   * yeni is kabul etmeyi kes -> creds flush'ini BEKLE -> sock.end()
   * -> ANCAK socket kapandiktan sonra kirayi birak.
   *
   * sock.logout() ASLA cagrilmaz: WhatsApp'a remove-companion-device gonderip
   * cihazi kalici olarak siler, yani her deploy tum hesaplari unlink eder.
   *
   * userRequested=true → bilincli "Kapat"; resume edilmez.
   * userRequested=false (deploy) → connecting birakilir; sonraki process resumeAll ile acar.
   */
  async shutdown(options?: { userRequested?: boolean }): Promise<void> {
    if (this.shuttingDown) return
    this.shuttingDown = true
    this.stopHeartbeat()

    try {
      await this.auth?.saveCreds()
    } catch (error) {
      this.log.warn({ err: error }, 'Kapanista saveCreds basarisiz')
    }

    try {
      await this.sock?.end(undefined)
    } catch (error) {
      this.log.debug({ err: error }, 'sock.end sirasinda hata')
    }

    if (options?.userRequested) {
      await patchAccount(this.accountId, {
        status: 'disconnected',
        status_detail: 'Baglanti kapatildi',
        qr_code: null,
        pairing_code: null,
      })
      this.status = 'disconnected'
    } else {
      await patchAccount(this.accountId, {
        status: 'connecting',
        status_detail: 'Servis yeniden baslatiliyor',
        qr_code: null,
      })
      this.status = 'connecting'
    }

    await this.releaseLeaseSafely()
    this.disposed = true
  }

  /** Socket'i birakip kirayi geri verir; yeniden baglanma denenmez. */
  private async finish(outcome: SessionOutcome): Promise<void> {
    this.shuttingDown = true
    this.stopHeartbeat()

    try {
      await this.sock?.end(undefined)
    } catch {
      // Socket zaten kapali olabilir.
    }

    // handed-over durumunda kira zaten baskasinda; silmeye calismak
    // epoch citi sayesinde no-op olur, yine de gereksiz sorgu atmiyoruz.
    if (outcome !== 'handed-over') {
      await this.releaseLeaseSafely()
    }

    this.disposed = true
    this.onClosed?.(outcome)
  }

  private async releaseLeaseSafely(): Promise<void> {
    try {
      await releaseLease(this.accountId, this.epoch)
    } catch (error) {
      this.log.warn({ err: error }, 'Kira birakilamadi, suresi dolunca serbest kalacak')
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat)
      this.heartbeat = undefined
    }
  }

  private async setStatus(status: AccountStatus): Promise<void> {
    this.status = status
    await patchAccount(this.accountId, { status })
  }

  /** logAccountEvent'in bekledigi sekil. */
  get id(): string {
    return this.accountId
  }

  get owner_id(): string {
    return this.ownerId
  }
}

function extractStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const output = (error as { output?: { statusCode?: number } }).output
  if (typeof output?.statusCode === 'number') return output.statusCode

  const direct = (error as { statusCode?: number }).statusCode
  return typeof direct === 'number' ? direct : undefined
}

function parseTimestamp(value: string | undefined): string | null {
  if (!value) return null

  // WhatsApp bu alanlari saniye cinsinden epoch metni olarak gonderiyor.
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric * 1_000).toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
