import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { expectedMonitorToken, verifyMonitorPassword, verifyMonitorToken } from './monitor-auth'

test('unconfigured monitoring never accepts a public fallback PIN or empty cookie', () => {
  const fixturePin = randomBytes(16).toString('hex')
  const fixtureSecret = randomBytes(16).toString('hex')
  for (const env of [{}, { CANLI_TAKIP_PIN: fixturePin }, { SUPABASE_JWT_SECRET: fixtureSecret }]) {
    assert.equal(expectedMonitorToken(env), '')
    assert.equal(verifyMonitorPassword(fixturePin, env), false)
    assert.equal(verifyMonitorToken('', env), false)
  }
})
test('monitoring requires both configured secrets and rejects a wrong cookie or PIN', () => {
  const fixturePin = randomBytes(16).toString('hex')
  const fixtureSecret = randomBytes(16).toString('hex')
  const env = { CANLI_TAKIP_PIN: fixturePin, SUPABASE_JWT_SECRET: fixtureSecret }
  assert.equal(verifyMonitorPassword(fixturePin, env), true)
  assert.equal(verifyMonitorPassword('wrong', env), false)
  assert.equal(verifyMonitorToken(expectedMonitorToken(env), env), true)
  assert.equal(verifyMonitorToken('wrong', env), false)
  assert.notEqual(expectedMonitorToken(env), expectedMonitorToken({ ...env, SUPABASE_JWT_SECRET: 'other' }))
})
