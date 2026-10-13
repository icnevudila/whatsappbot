const test = require('node:test');
const assert = require('node:assert/strict');
const { reconnectImageObservation, isImageObservationContextLost } = require('../image_observation_reconnect.js');

test('navigation-invalidated execution context resumes observation, never treats provider rejection as reconnectable', () => {
  for (const message of ['Cannot find default execution context', 'Cannot find context with specified id',
    'Execution context was destroyed.', '[CDP Error] WebSocket not open']) {
    assert.equal(isImageObservationContextLost(new Error(message)), true);
  }
  for (const message of ['Content policy rejection', 'Insufficient credits', 'Generation failed', 'Timeout waiting for image']) {
    assert.equal(isImageObservationContextLost(new Error(message)), false);
  }
});

test('reconnect uses only original target despite another active customer tab', async () => {
  const calls = [];
  const session = {};
  const actual = await reconnectImageObservation({ targetId: 'original',
    listTargets: async () => [
      { id: 'other', type: 'page', url: 'https://chatgpt.com/c/other', webSocketDebuggerUrl: 'ws://other' },
      { id: 'original', type: 'page', url: 'https://chatgpt.com/c/original', webSocketDebuggerUrl: 'ws://original' },
    ], connect: async url => { calls.push(url); return session; } });
  assert.equal(actual, session);
  assert.deepEqual(calls, ['ws://original']);
});

test('lost or repurposed target fails closed without connecting to another conversation', async () => {
  for (const targets of [[], [{ id: 'original', type: 'page', url: 'https://example.com', webSocketDebuggerUrl: 'ws://wrong' }]]) {
    await assert.rejects(reconnectImageObservation({ targetId: 'original', listTargets: async () => targets,
      connect: async () => { throw new Error('must not connect'); } }), /IMAGE_OBSERVATION_TARGET_LOST/);
  }
});
