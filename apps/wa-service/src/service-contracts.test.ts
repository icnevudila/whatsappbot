import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('aylik kota sayimi message_log.direction=out kullanir (outbound degil)', () => {
  const src = readFileSync(join(root, 'src/campaign-runner.ts'), 'utf8')
  assert.match(src, /orgMonthlyOutboundCount[\s\S]*direction = 'out'/)
  assert.doesNotMatch(
    src,
    /orgMonthlyOutboundCount[\s\S]*direction = 'outbound'/,
  )
})

test('reviveStale soft reopen kullanir (userRequested disconnect yok)', () => {
  const src = readFileSync(join(root, 'src/session-manager.ts'), 'utf8')
  const revive = src.slice(src.indexOf('async reviveStale'))
  assert.match(revive, /userRequested:\s*false/)
  assert.doesNotMatch(revive.slice(0, 500), /disconnect\(/)
})

test('monitoring flushMonitoring export eder', () => {
  const src = readFileSync(join(root, 'src/monitoring.ts'), 'utf8')
  assert.match(src, /export async function flushMonitoring/)
})
