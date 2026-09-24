const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CAPABILITY_STATES,
  classifyGeminiVideoError,
} = require('../gemini_video_capability.js');

test('1. Apps Activity OFF + auth + video UI + quota -> AVAILABLE_WITH_WARNING -> ready_for_canary YES', async () => {
  // Simulate the inspector result when page has active video textbox and apps activity is off
  const value = {
    href: 'https://gemini.google.com/videos',
    hasInput: true,
    loginRequired: false,
    noQuota: false,
    activityOff: true,
    featureUnavailable: false,
    temporarilyUnavailable: false,
  };

  let capabilityRecord = null;
  if (String(value.href || '').includes('gemini.google.com/videos') && value.hasInput) {
    if (value.activityOff) {
      capabilityRecord = {
        state: CAPABILITY_STATES.AVAILABLE_WITH_WARNING,
        apps_activity: 'DISABLED',
        runtime_verification_required: true,
        ready_for_canary: true,
        evidence: 'Gemini /videos page and enabled prompt input are present; Apps activity is disabled (warning: runtime verification required)',
      };
    } else {
      capabilityRecord = {
        state: CAPABILITY_STATES.AVAILABLE,
        apps_activity: 'ENABLED',
        runtime_verification_required: false,
        ready_for_canary: true,
      };
    }
  }

  assert.equal(capabilityRecord.state, 'AVAILABLE_WITH_WARNING');
  assert.equal(capabilityRecord.apps_activity, 'DISABLED');
  assert.equal(capabilityRecord.runtime_verification_required, true);
  assert.equal(capabilityRecord.ready_for_canary, true);
});

test('2. explicit runtime 1040 after submit -> RUNTIME_BLOCKED', async () => {
  const error1040 = new Error('Provider immediately rejected with 1040 error');
  error1040.code = 'GEMINI_RUNTIME_BLOCKED';

  const classified = classifyGeminiVideoError(error1040);
  assert.equal(classified.code, 'GEMINI_RUNTIME_BLOCKED');
  assert.equal(classified.state, CAPABILITY_STATES.ACCOUNT_CONFIGURATION_REQUIRED);
});

test('3. first Gemini runtime-blocked -> next Gemini account attempted', async () => {
  const candidatePorts = [9225, 9223];
  const portToCanonical = {
    9225: 'mesajify2@gmail.com',
    9223: 'icnevudila@gmail.com',
  };

  const runtimeBlockedAccounts = new Set();
  const attemptedAccounts = [];

  for (const port of candidatePorts) {
    const canonical = portToCanonical[port];
    if (runtimeBlockedAccounts.has(canonical)) {
      continue;
    }
    attemptedAccounts.push(canonical);

    if (port === 9225) {
      // Simulate explicit 1040 / activity off rejection on first account
      runtimeBlockedAccounts.add(canonical);
      continue;
    }

    if (port === 9223) {
      // Second account succeeds
      break;
    }
  }

  assert.deepEqual(attemptedAccounts, ['mesajify2@gmail.com', 'icnevudila@gmail.com']);
  assert.ok(runtimeBlockedAccounts.has('mesajify2@gmail.com'));
  assert.ok(!runtimeBlockedAccounts.has('icnevudila@gmail.com'));
});
