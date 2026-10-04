'use strict';
const { isWorkerControlPath } = require('./gateway_request_guard.js');

/** Credentials belong only to the configured gateway's worker control routes. */
function createWorkerGatewayFetch(gatewayUrl, env = process.env, transport = globalThis.fetch) {
  const gateway = new URL(gatewayUrl);
  return function workerFetch(input, init = {}) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.origin !== gateway.origin || !isWorkerControlPath(url.pathname)) return transport(input, init);
    let secret = String(env.WORKER_CONTROL_TOKEN || '');
    if (!secret) {
      try {
        const tokenFile = require('node:path').join(__dirname, '.worker_control_token');
        if (require('node:fs').existsSync(tokenFile)) {
          secret = require('node:fs').readFileSync(tokenFile, 'utf8').trim();
        }
      } catch {}
    }
    if (!secret && env.NODE_ENV === 'production') {
      throw new Error('WORKER_CONTROL_TOKEN_REQUIRED');
    }
    const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined));
    if (secret) headers.set('x-worker-token', secret);
    // Never forward the control credential through redirects to an untrusted origin.
    return transport(input, { ...init, headers, redirect: 'error' });
  };
}
module.exports = { createWorkerGatewayFetch };
