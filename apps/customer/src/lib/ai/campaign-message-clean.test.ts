import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanAiMessage } from './campaign-message'

test('removes observed AI style labels without changing customer campaign copy', () => {
  const copy = 'Tuğla siparişleriniz 3 gün içinde kapınıza teslim edilir.'
  assert.equal(cleanAiMessage(`Samimi Kampanya Mesajı\n\n${copy}`), copy)
  assert.equal(cleanAiMessage(`Satış Odaklı Kampanya Metni:\r\n${copy}`), copy)
  assert.equal(cleanAiMessage(`Kampanya Mesajı\n${copy}`), copy)
  assert.equal(cleanAiMessage(`Tuğla Kampanyası\n\n${copy}`), `Tuğla Kampanyası\n\n${copy}`)
  assert.equal(cleanAiMessage('Samimi Kampanya Mesajı taslağını inceleyin.'), 'Samimi Kampanya Mesajı taslağını inceleyin.')
})
