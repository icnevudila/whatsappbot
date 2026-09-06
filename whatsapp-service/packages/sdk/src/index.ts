/**
 * Host panel / API için tip sözleşmesi.
 *
 * ```ts
 * import { JOB_TYPES, type JobPayloadMap } from '@wa/whatsapp-sdk'
 * // INSERT INTO jobs (type, payload, ...) VALUES (JOB_TYPES.MESSAGE_SEND, {...})
 * ```
 *
 * Runtime worker ayrı process: docker compose veya `npm start` (@wa/service).
 */
export {
  JOB_TYPES,
  ACCOUNT_LOCK_REASONS,
  e164ToJid,
  jidToE164,
  toE164,
} from '@wa/shared'

export type {
  JobType,
  JobStatus,
  JobPayload,
  JobPayloadMap,
  AccountStatus,
  CampaignStatus,
  TargetStatus,
  MessageType,
  WaCheckStatus,
  ContactSource,
  EventLevel,
  AccountLockReason,
} from '@wa/shared'
