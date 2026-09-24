'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyGeminiVideoError,
  FALLBACK_CAPABILITY_STATES,
} = require('../gemini_video_capability.js');

test('classifies the three allowed automatic fallback conditions', () => {
  assert.equal(classifyGeminiVideoError('video generation limit reached').state, 'NO_QUOTA');
  assert.equal(classifyGeminiVideoError('video is not available for your account').state, 'FEATURE_UNAVAILABLE');
  assert.equal(classifyGeminiVideoError('browser target closed temporarily').state, 'TEMPORARILY_UNAVAILABLE');
  assert.equal(FALLBACK_CAPABILITY_STATES.has('NO_QUOTA'), true);
  assert.equal(FALLBACK_CAPABILITY_STATES.has('FEATURE_UNAVAILABLE'), true);
  assert.equal(FALLBACK_CAPABILITY_STATES.has('TEMPORARILY_UNAVAILABLE'), true);
});

test('does not classify content and tenant failures as provider availability', () => {
  assert.equal(classifyGeminiVideoError('ASSET_ORG_MISMATCH').code, 'TENANT_MISMATCH');
  assert.equal(classifyGeminiVideoError('policy safety rejection').code, 'POLICY_REJECTED');
  assert.equal(classifyGeminiVideoError('wrong product factual gate').code, 'FACTUAL_GATE_FAILURE');
});

test('ambiguous internal errors stay UNKNOWN', () => {
  const result = classifyGeminiVideoError('unexpected internal response shape');
  assert.equal(result.code, 'GEMINI_VIDEO_UNKNOWN');
  assert.equal(result.state, 'UNKNOWN');
  assert.equal(FALLBACK_CAPABILITY_STATES.has(result.state), false);
});

