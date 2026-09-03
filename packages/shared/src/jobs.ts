// Panel ile servis arasindaki sozlesme.
// Panel bu tiplerle jobs tablosuna satir yazar, servis ayni tiplerle okur.
// Veritabanindaki CHECK kisitlari ile bire bir ayni tutulmali.

export const JOB_TYPES = [
  'account.connect',
  'account.disconnect',
  'account.logout',
  'account.request_pairing_code',
  'message.send',
  'contacts.verify',
  'creative.render',
  'campaign.start',
  'campaign.pause',
  'campaign.resume',
  'campaign.stop',
] as const

export type JobType = (typeof JOB_TYPES)[number]

export type JobStatus =
  | 'pending'
  | 'claimed'
  | 'running'
  | 'done'
  | 'failed'
  | 'cancelled'

export type AccountStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'pairing_pending'
  | 'connected'
  | 'logged_out'
  | 'banned'
  | 'error'

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'stopped'
  | 'failed'

export type TargetStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'skipped'

export type MessageType = 'text' | 'image' | 'video' | 'document'

/** onWhatsApp() dogrulama sonucu. Gonderim yalnizca 'valid' hedeflere gider. */
export type WaCheckStatus = 'unknown' | 'valid' | 'invalid'

export type ContactSource = 'manual' | 'csv' | 'xlsx' | 'scraper' | 'api'

export type EventLevel = 'debug' | 'info' | 'warn' | 'error'

/** Her is tipinin payload sekli. */
export type JobPayloadMap = {
  'account.connect': { force?: boolean }
  'account.disconnect': Record<string, never>
  'account.logout': Record<string, never>
  'account.request_pairing_code': { phone_e164: string }
  'message.send': {
    phone_e164: string
    body?: string
    media_url?: string
    message_type?: MessageType
  }
  'contacts.verify': { list_id?: string; contact_ids?: string[] }
  'creative.render': { creative_id: string }
  'campaign.start': Record<string, never>
  'campaign.pause': Record<string, never>
  'campaign.resume': Record<string, never>
  'campaign.stop': { reason?: string }
}

export type JobPayload<T extends JobType = JobType> = JobPayloadMap[T]

/** Hesabi kalici olarak kilitleyen sebepler. Kampanyalar da durur. */
export const ACCOUNT_LOCK_REASONS = {
  forbidden: '403 forbidden: hesap WhatsApp tarafindan kisitlandi',
  deviceRemoved: 'device_removed: cihaz telefondan kaldirildi',
  reachOutTimeLock: '463 reach-out time-lock: tanimadigi kisilere gonderim kisiti',
  replacedLoop: 'connectionReplaced dongusu: oturum baska bir yerde acilmis',
} as const

export type AccountLockReason = keyof typeof ACCOUNT_LOCK_REASONS
