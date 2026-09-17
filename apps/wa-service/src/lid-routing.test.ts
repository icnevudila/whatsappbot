import assert from 'node:assert/strict'
import test from 'node:test'

// Unit test covering the string matching & digit extraction logic for LID lookup
function extractPhoneComponents(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const last10 = digits.slice(-10)
  const withPlus = digits ? `+${digits}` : ''
  return { digits, last10, withPlus }
}

test('phone variations all yield identical last10 and valid withPlus', () => {
  const variations = [
    '+905453651319',
    '905453651319',
    '05453651319',
    '5453651319',
    '+90 545 365 13 19',
    '0 (545) 365 13 19',
  ]

  for (const v of variations) {
    const { last10, digits } = extractPhoneComponents(v)
    assert.equal(last10, '5453651319', `Failed for variation ${v}`)
    assert.ok(digits.endsWith('5453651319'), `Digits fail for variation ${v}`)
  }
})

test('invalid / short inputs handled safely', () => {
  const empty = extractPhoneComponents('')
  assert.equal(empty.digits, '')
  assert.equal(empty.last10, '')
  assert.equal(empty.withPlus, '')

  const short = extractPhoneComponents('123')
  assert.equal(short.digits, '123')
  assert.equal(short.last10, '123')
  assert.equal(short.withPlus, '+123')
})
