import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (name: string) => readFileSync(join(root, 'src', name), 'utf8')

test('auto-reply debounce sozlesmeleri ve cevre degiskenleri', () => {
  const envSrc = src('env.ts')
  assert.match(envSrc, /autoReplyDebounceMs:/)
  assert.match(envSrc, /autoReplyMaxWaitMs:/)
  assert.match(envSrc, /AUTO_REPLY_DEBOUNCE_MS/)
  assert.match(envSrc, /AUTO_REPLY_MAX_WAIT_MS/)
})

test('inbound.ts auto-reply cagrilarinda remoteJid ve sock iletir', () => {
  const inboundSrc = src('inbound.ts')
  assert.match(inboundSrc, /remoteJid:\s*key\.remoteJid/)
  assert.match(inboundSrc, /sock,/)
})

test('auto-reply.ts tamponlama (debounce) ve composing varlik bildirimi icerir', () => {
  const autoReplySrc = src('auto-reply.ts')
  assert.match(autoReplySrc, /getActiveDebounceBufferCount/)
  assert.match(autoReplySrc, /flushAllAutoReplyBuffers/)
  assert.match(autoReplySrc, /clearAutoReplyBuffers/)
  assert.match(autoReplySrc, /sendPresenceUpdate\('composing'/)
  assert.match(autoReplySrc, /sendPresenceUpdate\('paused'/)
  assert.match(autoReplySrc, /messages\.join\('\\n'\)/)
})
