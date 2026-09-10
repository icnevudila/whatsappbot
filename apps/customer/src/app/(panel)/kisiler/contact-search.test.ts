import assert from 'node:assert/strict'
import test from 'node:test'
import { contactSearchOrFilter, phoneSearchNeedle, sanitizeContactSearch } from './contact-search'

test('sanitizeContactSearch boş ve uzun metin', () => {
  assert.equal(sanitizeContactSearch('  Yusuf  '), 'Yusuf')
  assert.equal(sanitizeContactSearch('a'.repeat(100)).length, 80)
})

test('phoneSearchNeedle TR ve ham basamak', () => {
  assert.equal(phoneSearchNeedle('Yusuf'), null)
  assert.equal(phoneSearchNeedle('0532 111 22 33'), '5321112233')
  assert.equal(phoneSearchNeedle('+90 532 111 22 33'), '5321112233')
  assert.equal(phoneSearchNeedle('532'), '532')
})

test('contactSearchOrFilter ad ve telefon', () => {
  assert.equal(contactSearchOrFilter('   '), null)
  const name = contactSearchOrFilter('Yusuf')
  assert.ok(name?.includes('name.ilike."%Yusuf%"'))
  assert.ok(name?.includes('phone_e164.ilike."%Yusuf%"'))
  assert.equal(name?.includes('532'), false)

  const phone = contactSearchOrFilter('0532 111 22 33')
  assert.ok(phone?.includes('5321112233'))
})
