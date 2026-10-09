'use strict';
const crypto = require('node:crypto');

function typedError(code, statusCode, message = code) {
  return Object.assign(new Error(message), { code, statusCode });
}

function isWorkerControlPath(pathname) {
  // Protect whole control namespaces, including future claim/fail/reconcile routes.
  // Public generation/status receipts are not worker-control endpoints.
  return pathname === '/job' || pathname.startsWith('/job/')
    || pathname === '/worker' || pathname.startsWith('/worker/')
    || ['/upload', '/v1/upload'].includes(pathname)
    || pathname === '/v1/browser-workers' || pathname.startsWith('/v1/browser-workers/');
}

function isAuthorizedWorker(req, env = process.env) {
  let secret = String(env.WORKER_CONTROL_TOKEN || '');
  if (!secret) {
    try {
      const tokenFile = require('node:path').join(__dirname, '.worker_control_token');
      if (require('node:fs').existsSync(tokenFile)) {
        secret = require('node:fs').readFileSync(tokenFile, 'utf8').trim();
      }
    } catch {}
  }
  if (secret) {
    const supplied = req.headers?.['x-worker-token'];
    if (typeof supplied !== 'string') return false;
    // Equal-size digests avoid a length-dependent timingSafeEqual exception.
    return crypto.timingSafeEqual(crypto.createHash('sha256').update(secret).digest(),
      crypto.createHash('sha256').update(supplied).digest());
  }
  if (env.NODE_ENV === 'production') return false;
  // Local development/tests retain loopback compatibility, never RFC1918 bypass.
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);
}

function configuredLimit(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw typedError('INVALID_BODY_LIMIT', 500);
  return parsed;
}

function readBoundedBody(req, maximumBytes) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let chunks = [];
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
      req.removeListener('aborted', onAbort);
      chunks = [];
      if (error) { req.pause(); reject(error); } else resolve(value);
    };
    const onData = chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > maximumBytes) return finish(typedError('PAYLOAD_TOO_LARGE', 413));
      chunks.push(buffer);
    };
    const onEnd = () => finish(null, Buffer.concat(chunks, bytes));
    const onError = error => finish(error);
    const onAbort = () => finish(typedError('REQUEST_ABORTED', 400));
    const declared = req.headers?.['content-length'];
    if (declared !== undefined && (!/^\d+$/.test(String(declared)) || Number(declared) > maximumBytes)) {
      return finish(typedError('PAYLOAD_TOO_LARGE', 413));
    }
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.on('aborted', onAbort);
  });
}

module.exports = { typedError, isWorkerControlPath, isAuthorizedWorker, configuredLimit, readBoundedBody };
