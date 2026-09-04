import { loadAccount, loadResumableAccounts, logAccountEvent, patchAccount } from './accounts.js'
import { acquireLease } from './lease.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { WhatsAppSession } from './session.js'
import { query } from './db.js'

export type ConnectResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'not-found'
        | 'disabled'
        | 'locked'
        | 'already-active'
        | 'capacity'
        | 'leased-elsewhere'
      detail?: string
    }

const log = logger.child({ scope: 'session-manager' })

export class SessionManager {
  private readonly sessions = new Map<string, WhatsAppSession>()

  /**
   * Senkron slot rezervasyonu.
   * Iki eszamanli connect() cagrisi yarisabiliyor; slot herhangi bir await'ten
   * ONCE rezerve edilmezse ayni hesap icin ikinci bir paralel baglanti doguyor.
   */
  private readonly reserving = new Set<string>()

  get activeCount(): number {
    return this.sessions.size
  }

  get(accountId: string): WhatsAppSession | undefined {
    return this.sessions.get(accountId)
  }

  liveSessions(): WhatsAppSession[] {
    return [...this.sessions.values()].filter((session) => session.isLive)
  }

  async connect(accountId: string): Promise<ConnectResult> {
    // --- await'siz bolge basi ---
    if (this.sessions.has(accountId) || this.reserving.has(accountId)) {
      return { ok: false, reason: 'already-active' }
    }
    if (this.sessions.size + this.reserving.size >= env.maxSessions) {
      return { ok: false, reason: 'capacity' }
    }
    this.reserving.add(accountId)
    // --- await'siz bolge sonu ---

    try {
      const account = await loadAccount(accountId)
      if (!account) return { ok: false, reason: 'not-found' }
      if (!account.enabled) return { ok: false, reason: 'disabled' }
      if (account.is_locked) return { ok: false, reason: 'locked' }

      // Kira alinmadan socket acilmaz.
      const lease = await acquireLease(accountId)
      if (!lease.acquired) {
        log.warn(
          { accountId, holder: lease.holderId },
          "Kira baska bir process'te, baglanti acilmiyor",
        )
        return {
          ok: false,
          reason: 'leased-elsewhere',
          detail: lease.holderId ?? undefined,
        }
      }

      const session = new WhatsAppSession(account, lease.epoch)

      session.onClose((outcome) => {
        this.sessions.delete(accountId)
        log.info({ accountId, outcome }, 'Oturum kapandi')
      })

      // Health check'in "beklenen" tarafi icin start'tan once kayit ediliyor.
      this.sessions.set(accountId, session)

      try {
        await session.start()
      } catch (error) {
        this.sessions.delete(accountId)
        await patchAccount(accountId, {
          status: 'error',
          status_detail: error instanceof Error ? error.message : 'Baglanti kurulamadi',
        })
        throw error
      }

      return { ok: true }
    } finally {
      this.reserving.delete(accountId)
    }
  }

  /**
   * Kod ile eslesme. Oturum acik degilse once aciyoruz: kod ancak canli bir
   * soket uzerinden istenebiliyor, panel tek tikta hallolsun.
   */
  async requestPairingCode(accountId: string, phone: string): Promise<string> {
    if (!this.sessions.has(accountId)) {
      const result = await this.connect(accountId)
      if (!result.ok && result.reason !== 'already-active') {
        throw new Error(`Oturum acilamadi: ${result.reason}`)
      }
    }

    const session = this.sessions.get(accountId)
    if (!session) throw new Error('Oturum bulunamadi')

    return session.requestPairingCode(phone)
  }

  async disconnect(accountId: string): Promise<boolean> {
    const session = this.sessions.get(accountId)
    if (!session) {
      await patchAccount(accountId, {
        status: 'disconnected',
        status_detail: 'Baglanti kapatildi',
        qr_code: null,
        pairing_code: null,
      })
      return false
    }

    await session.shutdown({ userRequested: true })
    this.sessions.delete(accountId)
    return true
  }

  async logout(accountId: string): Promise<void> {
    const session = this.sessions.get(accountId)

    if (session) {
      await session.logout()
      this.sessions.delete(accountId)
      return
    }

    // Oturum bu process'te acik degil: kimlik bilgilerini yerelde temizle.
    // WhatsApp'a haber verilemiyor ama panel dogru durumu gorur.
    const account = await loadAccount(accountId)
    await query('delete from wa.auth_state where account_id = $1', [accountId])
    await query('delete from wa.creds where account_id = $1', [accountId])
    await patchAccount(accountId, {
      status: 'logged_out',
      status_detail: 'Kimlik bilgileri silindi, yeni QR gerekiyor',
      qr_code: null,
      wa_jid: null,
      wa_lid: null,
      phone_e164: null,
    })

    if (account) {
      await logAccountEvent(account, 'warn', 'account.auth_cleared', {})
    }
  }

  /** Servis yeniden acildiginda daha once bagli olan hesaplari geri getirir. */
  async resumeAll(): Promise<void> {
    const accounts = await loadResumableAccounts(env.maxSessions)
    if (accounts.length === 0) {
      log.info('Devam ettirilecek hesap yok')
      return
    }

    log.info({ count: accounts.length }, 'Hesaplar geri getiriliyor')

    for (const account of accounts) {
      const result = await this.connect(account.id)
      if (!result.ok) {
        log.info({ accountId: account.id, reason: result.reason }, 'Hesap atlandi')
      }
    }
  }

  /**
   * Socket'in sessizce olmesi en can sikici ariza: process ayakta, hesap olu,
   * kimse fark etmiyor. Bu yuzden "servis ayakta mi" degil, beklenen canli
   * oturum sayisi ile gercek canli socket sayisi karsilastiriliyor.
   */
  async healthReport(): Promise<{
    healthy: boolean
    tracked: number
    live: number
    stale: string[]
  }> {
    const stale: string[] = []

    for (const [accountId, session] of this.sessions) {
      if (session.currentStatus === 'connected' && !session.isLive) {
        stale.push(accountId)
      }
    }

    return {
      // Tek stale oturum tüm worker'ı unhealthy göstermesin; revive path halleder.
      // Yalnızca hiç live yokken ve tracked > 0 ise unhealthy (tamamen ölü).
      healthy: stale.length === 0 || this.liveSessions().length > 0,
      tracked: this.sessions.size,
      live: this.liveSessions().length,
      stale,
    }
  }

  /** Sessizce olmus socket'leri kapatip yeniden acar. */
  async reviveStale(): Promise<void> {
    const { stale } = await this.healthReport()

    for (const accountId of stale) {
      log.warn({ accountId }, 'Sessiz olmus socket tespit edildi, yeniden aciliyor')
      await this.disconnect(accountId)
      await this.connect(accountId)
    }
  }

  async shutdownAll(): Promise<void> {
    const sessions = [...this.sessions.values()]
    this.sessions.clear()

    await Promise.allSettled(sessions.map((session) => session.shutdown()))
  }
}

export const sessionManager = new SessionManager()
