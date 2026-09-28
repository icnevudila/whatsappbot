const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const EventEmitter = require('node:events');

// Evaluate the actual probe without loading generation pools or touching live
// profiles. Only transport, timers and configuration persistence are mocked.
const source = fs.readFileSync(require.resolve('../generate_video.js'), 'utf8');
const start = source.indexOf('async function verifyAccount(port) {');
const end = source.indexOf('function resetAccountLimit(port) {', start);
assert.ok(start >= 0 && end > start);
function harness(observations) {
  const saves = [];
  let probes = 0;
  class Socket extends EventEmitter {
    constructor() { super(); queueMicrotask(() => this.emit('open')); }
    send() {
      const value = observations[Math.min(probes++, observations.length - 1)];
      queueMicrotask(() => this.emit('message', JSON.stringify({ id: 1, result: { result: { value } } })));
    }
    close() {}
  }
  const pool = {};
  const context = vm.createContext({
    WebSocket: Socket, AbortSignal, accountPool: pool,
    PORT_CANONICAL_ACCOUNTS: { 9225: 'mesajify2@gmail.com' },
    fetch: async () => ({ ok: true, json: async () => [{ type: 'page', url: 'https://gemini.google.com/videos', webSocketDebuggerUrl: 'ws://mock' }] }),
    loadAccountsConfig: () => ({ accounts: {} }),
    saveAccountsConfig: cfg => saves.push(cfg),
    setTimeout: (fn, ms) => setTimeout(fn, ms === 500 ? 1 : 100),
    clearTimeout,
  });
  const verify = vm.runInContext(source.slice(start, end) + '\nverifyAccount', context);
  return { verify, saves, pool, probes: () => probes };
}

test('account probe waits for hydrated identity before persisting a successful login', async () => {
  const h = harness([
    { signIn: false, isLoggedIn: false },
    { signIn: false, isLoggedIn: true, email: null },
    { signIn: false, isLoggedIn: true, email: 'mesajify2@gmail.com' },
  ]);
  const result = await h.verify(9225);
  assert.equal(result.ok, true);
  assert.equal(result.email, 'mesajify2@gmail.com');
  assert.equal(h.probes(), 3);
  assert.equal(h.saves.length, 1);
  assert.equal(h.pool[9225].notLoggedIn, false);
});

test('explicit signed-out page is not persisted as verified account configuration', async () => {
  const h = harness([{ signIn: true, isLoggedIn: false }]);
  const result = await h.verify(9225);
  assert.equal(result.isLoggedIn, false);
  assert.equal(h.probes(), 1);
  assert.equal(h.saves.length, 0);
  assert.equal(h.pool[9225].notLoggedIn, true);
});

test('wrong Google account cannot overwrite the configured identity', async () => {
  const h = harness([{ signIn: false, isLoggedIn: true, email: 'mesajify1@gmail.com' }]);
  const result = await h.verify(9225);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'ACCOUNT_MISMATCH');
  assert.equal(h.saves.length, 0);
});

test('page that never hydrates fails without persisting authentication', async () => {
  const h = harness([{ signIn: false, isLoggedIn: false }]);
  const result = await h.verify(9225);
  assert.equal(result.ok, false);
  assert.match(result.error, /did not become ready/);
  assert.equal(h.saves.length, 0);
});
