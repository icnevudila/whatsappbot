import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { JOB_TYPES } from '@wa/shared'
import { AUTH_SCHEMA_VERSION } from './auth-schema.js'
import { computeWorkerReady } from './health-ready.js'
import { isWabaConfigured } from './waba-config.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (name: string) => readFileSync(join(root, 'src', name), 'utf8')

test('aylik kota sayimi message_log.direction=out kullanir (outbound degil)', () => {
  const file = src('campaign-runner.ts')
  assert.match(file, /orgMonthlyOutboundCount[\s\S]*direction = 'out'/)
  assert.doesNotMatch(file, /orgMonthlyOutboundCount[\s\S]*direction = 'outbound'/)
})

test('reviveStale soft reopen kullanir (userRequested disconnect yok)', () => {
  const file = src('session-manager.ts')
  const revive = file.slice(file.indexOf('async reviveStale'))
  assert.match(revive, /userRequested:\s*false/)
  assert.doesNotMatch(revive.slice(0, 600), /\.disconnect\(/)
})

test('monitoring flushMonitoring export eder', () => {
  assert.match(src('monitoring.ts'), /export async function flushMonitoring/)
})

test('AUTH_SCHEMA_VERSION Baileys 6 icin 7', () => {
  assert.equal(AUTH_SCHEMA_VERSION, 7)
})

test('Baileys pin 6.7.24 (v7 rc uretime alinmaz)', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>
  }
  assert.equal(pkg.dependencies['@whiskeysockets/baileys'], '6.7.24')
})

test('computeWorkerReady matrisi', () => {
  assert.deepEqual(
    computeWorkerReady({ dbOk: true, tracked: 0, live: 0, staleCount: 0 }),
    { healthy: true, ready: true, degraded: false },
  )
  assert.deepEqual(
    computeWorkerReady({ dbOk: true, tracked: 2, live: 2, staleCount: 0 }),
    { healthy: true, ready: true, degraded: false },
  )
  assert.deepEqual(
    computeWorkerReady({ dbOk: true, tracked: 2, live: 0, staleCount: 0 }),
    { healthy: true, ready: false, degraded: true },
  )
  assert.deepEqual(
    computeWorkerReady({ dbOk: true, tracked: 2, live: 1, staleCount: 1 }),
    { healthy: true, ready: false, degraded: true },
  )
  assert.deepEqual(
    computeWorkerReady({ dbOk: false, tracked: 0, live: 0, staleCount: 0 }),
    { healthy: false, ready: false, degraded: false },
  )
})

test('job-consumer tum JOB_TYPES case kapsar', () => {
  const file = src('job-consumer.ts')
  for (const type of JOB_TYPES) {
    assert.match(file, new RegExp(`case '${type.replace('.', '\\.')}':`), type)
  }
})

test('session creds.update saveCreds baglar', () => {
  const file = src('session.ts')
  assert.match(file, /creds\.update/)
  assert.match(file, /saveCreds/)
})

test('entrypoint WORKER_ID=auto hostname turetir', () => {
  const sh = readFileSync(join(root, 'scripts/entrypoint.sh'), 'utf8')
  assert.match(sh, /WORKER_ID.*=.*auto/)
  assert.match(sh, /hostname/)
})

test('isWabaConfigured token+phoneId ister', () => {
  const prevT = process.env.WABA_ACCESS_TOKEN
  const prevP = process.env.WABA_PHONE_NUMBER_ID
  delete process.env.WABA_ACCESS_TOKEN
  delete process.env.WABA_PHONE_NUMBER_ID
  assert.equal(isWabaConfigured(), false)
  process.env.WABA_ACCESS_TOKEN = 'x'
  process.env.WABA_PHONE_NUMBER_ID = 'y'
  assert.equal(isWabaConfigured(), true)
  if (prevT === undefined) delete process.env.WABA_ACCESS_TOKEN
  else process.env.WABA_ACCESS_TOKEN = prevT
  if (prevP === undefined) delete process.env.WABA_PHONE_NUMBER_ID
  else process.env.WABA_PHONE_NUMBER_ID = prevP
})

test('docker compose healthcheck /ready kullanir', () => {
  const compose = readFileSync(join(root, '../../infra/docker-compose.yml'), 'utf8')
  assert.match(compose, /8080\/ready/)
  assert.doesNotMatch(compose, /healthcheck:[\s\S]{0,200}8080\/health/)
})

test('shutdown sending reclaim SQL session_lease holder kullanir', () => {
  const file = src('index.ts')
  assert.match(file, /campaign_targets[\s\S]*session_lease[\s\S]*sending/)
  assert.match(file, /flushMonitoring/)
})
