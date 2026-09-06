import { proto } from '@whiskeysockets/baileys'

export type OutboundStatus = 'sent' | 'delivered' | 'read' | 'failed'

/** Baileys ack → outbound status. ERROR → failed. */
export function statusFromAck(status: number | null | undefined): OutboundStatus | null {
  if (status == null) return null
  if (status === proto.WebMessageInfo.Status.ERROR) return 'failed'
  if (
    status === proto.WebMessageInfo.Status.READ ||
    status === proto.WebMessageInfo.Status.PLAYED
  ) {
    return 'read'
  }
  if (status === proto.WebMessageInfo.Status.DELIVERY_ACK) return 'delivered'
  if (status === proto.WebMessageInfo.Status.SERVER_ACK) return 'sent'
  return null
}
