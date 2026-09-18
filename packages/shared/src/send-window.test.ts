import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_SEND_WINDOW_END,
  DEFAULT_SEND_WINDOW_START,
  formatSendWindowWait,
  isWithinSendWindow,
  normalizeClock,
} from './send-window.js'

test('normalizeClock 08:00:00 ve 8:00 kabul eder', () => {
  assert.equal(normalizeClock('08:00:00'), '08:00')
  assert.equal(normalizeClock('8:00'), '08:00')
  assert.equal(normalizeClock('bogus'), DEFAULT_SEND_WINDOW_START)
})

test('08:00-18:00 pencerede / dışında', () => {
  const start = DEFAULT_SEND_WINDOW_START
  const end = DEFAULT_SEND_WINDOW_END
  // 11:00 Istanbul ≈ 08:00 UTC (yaz) veya 09:00 UTC (kış); 08:30 UTC güvenli gündüz.
  const inside = new Date('2026-06-12T08:30:00.000Z')
  const outside = new Date('2026-06-12T20:00:00.000Z')
  assert.equal(isWithinSendWindow(inside, start, end), true)
  assert.equal(isWithinSendWindow(outside, start, end), false)
})

test('start=end 24 saat açık', () => {
  const noon = new Date('2026-06-12T09:00:00.000Z')
  const night = new Date('2026-06-12T21:00:00.000Z')
  assert.equal(isWithinSendWindow(noon, '00:00', '00:00'), true)
  assert.equal(isWithinSendWindow(night, '00:00', '00:00'), true)
})

test('bekleme metni', () => {
  assert.equal(
    formatSendWindowWait('08:00:00', '18:00'),
    'Mesaj gönderme saat aralığı bekleniyor (08:00–18:00)',
  )
})
