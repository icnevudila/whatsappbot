import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { messageSendSkipped } from './message-send-result.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jobConsumerSrc = readFileSync(join(root, 'src', 'job-consumer.ts'), 'utf8')

test('messageSendSkipped: blacklist shape', () => {
  assert.deepEqual(messageSendSkipped('blacklist'), {
    skipped: true,
    reason: 'blacklist',
  })
})

test('messageSendSkipped: not_on_whatsapp shape', () => {
  assert.deepEqual(messageSendSkipped('not_on_whatsapp'), {
    skipped: true,
    reason: 'not_on_whatsapp',
  })
})

test('job-consumer message.send uses messageSendSkipped helpers', () => {
  assert.match(jobConsumerSrc, /messageSendSkipped\('blacklist'\)/)
  assert.match(jobConsumerSrc, /messageSendSkipped\('not_on_whatsapp'\)/)
})
