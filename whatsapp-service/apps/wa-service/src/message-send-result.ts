export type MessageSendSkipReason = 'blacklist' | 'not_on_whatsapp'

/** message.send erken cikis sekli — panel/job result sozlesmesi. */
export function messageSendSkipped(reason: MessageSendSkipReason): {
  skipped: true
  reason: MessageSendSkipReason
} {
  return { skipped: true, reason }
}
