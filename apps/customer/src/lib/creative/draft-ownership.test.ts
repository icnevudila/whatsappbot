import test from 'node:test'
import assert from 'node:assert/strict'
import { ownsStudioDraft } from './draft-ownership'

test('matching tenant and catalog product are both required before restoring draft copy', () => {
  assert.equal(ownsStudioDraft({ orgId: 'construction', heroProductId: 'brick' }, 'construction', ['brick']), true)
  assert.equal(ownsStudioDraft({ orgId: 'farming', heroProductId: 'sprayer' }, 'construction', ['brick']), false)
  assert.equal(ownsStudioDraft({ orgId: 'construction', heroProductId: 'sprayer' }, 'construction', ['brick']), false)
  assert.equal(ownsStudioDraft({ heroProductId: 'brick', customHeadline: 'Old unknown tenant copy' }, 'construction', ['brick']), false)
})

test('corrupt browser storage cannot become an owned draft', () => {
  for (const value of [null, 'draft', [], { orgId: 'construction', heroProductId: ['brick'] }]) {
    assert.equal(ownsStudioDraft(value, 'construction', ['brick']), false)
  }
})
