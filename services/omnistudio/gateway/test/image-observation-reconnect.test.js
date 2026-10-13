const test = require('node:test');
const assert = require('node:assert/strict');
const { reconnectImageObservation, isImageObservationContextLost, readWithImageReconnect } = require('../image_observation_reconnect.js');

test('output read resumes after closed socket without submitting another generation', async () => {
  const old = { close() {} }; const next = {}; let reads = 0; let reconnects = 0;
  const result = await readWithImageReconnect({ session: old,
    read: async session => { reads++; if (session === old) throw new Error('WebSocket not open (readyState: 3)'); return 'existing-output'; },
    reconnect: async () => { reconnects++; return next; } });
  assert.equal(result.value, 'existing-output'); assert.equal(result.session, next);
  assert.equal(reads, 2); assert.equal(reconnects, 1);
});

test('output reconnect is bounded and does not retry provider rejection', async () => {
  let reconnects = 0;
  await assert.rejects(readWithImageReconnect({session: {close() {}},
    read: async () => { throw new Error('WebSocket not open'); },
    reconnect: async () => { reconnects++; return {close() {}}; } }), /WebSocket not open/);
  assert.equal(reconnects, 2);
  await assert.rejects(readWithImageReconnect({session: {}, read: async () => {throw new Error('Content policy rejection');},
    reconnect: async () => {throw new Error('must not reconnect');} }), /Content policy rejection/);
});

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
