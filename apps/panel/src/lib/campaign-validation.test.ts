import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateAbSettings,
  validateCampaignSettings,
  validateMediaUrl,
  validateSchedule,
} from './campaign-validation'

test('validateAbSettings: 0 kapali, >0 B metni ister', () => {
  assert.equal(validateAbSettings(0, ''), null)
  assert.equal(validateAbSettings(50, 'Merhaba B'), null)
  assert.match(validateAbSettings(50, '') ?? '', /B varyant/)
  assert.match(validateAbSettings(101, 'x') ?? '', /0–100/)
  assert.match(validateAbSettings(1.5, 'x') ?? '', /0–100/)
})

test('validateSchedule: now serbest, schedule gelecekte', () => {
  assert.equal(validateSchedule('now', ''), null)
  assert.match(validateSchedule('schedule', '') ?? '', /tarih/)
  const soon = new Date(Date.now() + 10_000).toISOString().slice(0, 16)
  assert.match(validateSchedule('schedule', soon) ?? '', /1 dakika/)
  const later = new Date(Date.now() + 120_000).toISOString()
  assert.equal(validateSchedule('schedule', later), null)
})

test('validateCampaignSettings ve media', () => {
  assert.equal(validateCampaignSettings(8, 25, 100), null)
  assert.match(validateCampaignSettings(1, 25, 100) ?? '', /3–3600/)
  assert.equal(validateMediaUrl(''), null)
  assert.match(validateMediaUrl('http://x.com/a.png') ?? '', /HTTPS/)
})
