import test from 'node:test'
import assert from 'node:assert/strict'
import { isApprovedVideoOutput } from './video-output-approval'

test('technical validation alone never releases a video awaiting editorial review', () => {
  for (const verified of [false, true, undefined, null, 'true', 1]) {
    for (const is_approved of [false, true, undefined, null, 'true', 1]) {
      assert.equal(isApprovedVideoOutput({ verified, is_approved }), verified === true && is_approved === true)
    }
  }
})
