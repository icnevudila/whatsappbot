const test = require('node:test');
const assert = require('node:assert/strict');
const { reconnectImageObservation } = require('../image_observation_reconnect.js');

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
