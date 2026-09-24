import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalWorkerState,
  normalizeControlJobState,
  normalizeControlJobType,
} from '../apps/customer/src/lib/control-plane/projection'

test('normalizes heterogeneous job states without changing source schemas', () => {
  assert.equal(normalizeControlJobState('pending'), 'QUEUED')
  assert.equal(normalizeControlJobState('claimed'), 'ACTIVE')
  assert.equal(normalizeControlJobState('DOWNLOADING_MEDIA'), 'ACTIVE')
  assert.equal(normalizeControlJobState('done'), 'COMPLETED')
  assert.equal(normalizeControlJobState('NEEDS_REVIEW'), 'NEEDS_REVIEW')
  assert.equal(normalizeControlJobState('cancelled'), 'CANCELLED')
})

test('projects minimum required control-plane job types', () => {
  assert.equal(normalizeControlJobType('message.send', 'jobs'), 'MESSAGE')
  assert.equal(normalizeControlJobType('channel.qna.answer', 'channel_jobs'), 'AI_REPLY')
  assert.equal(normalizeControlJobType('image_generation', 'creatives'), 'IMAGE')
  assert.equal(normalizeControlJobType('subtitle.compose', 'jobs'), 'MEDIA_PROCESS')
  assert.equal(normalizeControlJobType('veo-fast', 'ai_media_jobs'), 'VIDEO')
  assert.equal(normalizeControlJobType('contacts.verify', 'jobs'), 'BACKGROUND_TASK')
})

test('uses the canonical browser-worker state vocabulary', () => {
  assert.equal(canonicalWorkerState('waiting_login'), 'AUTH_REQUIRED')
  assert.equal(canonicalWorkerState('rate_limited'), 'QUOTA_EXHAUSTED')
  assert.equal(canonicalWorkerState('cooling_down'), 'COOLDOWN')
  assert.equal(canonicalWorkerState('running'), 'BUSY')
  assert.equal(canonicalWorkerState('idle'), 'IDLE')
  assert.equal(canonicalWorkerState('idle', false), 'OFFLINE')
})
