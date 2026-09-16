import { BufferJSON, type proto } from '@whiskeysockets/baileys'

export function serializeSentMessage(message: proto.IMessage): string {
  return JSON.stringify(message, BufferJSON.replacer)
}

export function deserializeSentMessage(raw: unknown): proto.IMessage | undefined {
  if (!raw) return undefined
  return JSON.parse(JSON.stringify(raw), BufferJSON.reviver) as proto.IMessage
}
