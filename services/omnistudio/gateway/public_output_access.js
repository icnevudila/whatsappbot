'use strict';

const path = require('node:path');
const crypto = require('node:crypto');

const MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.m4a'
]);

// In-memory registry of output filename -> tenantId
const fileTenantRegistry = new Map();

function isMediaFilename(filename) {
  if (typeof filename !== 'string') return false;
  return MEDIA_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

// Deprecated name kept for backward compatibility if imported elsewhere
function isPublicMediaFilename(filename) {
  return isMediaFilename(filename);
}

function registerMediaOwner(filename, tenantId) {
  if (!filename || !tenantId) return;
  const base = path.basename(filename);
  fileTenantRegistry.set(base, String(tenantId));
}

function getMediaOwner(filename) {
  if (!filename) return null;
  const base = path.basename(filename);
  return fileTenantRegistry.get(base) || null;
}

function clearMediaRegistry() {
  fileTenantRegistry.clear();
}

function getSigningSecret(customSecret) {
  return String(
    customSecret ||
    process.env.MEDIA_SIGNING_SECRET ||
    process.env.OMNISTUDIO_GATEWAY_TOKEN ||
    'omnistudio-default-media-salt-2026'
  );
}

/**
 * Creates a signed access token or query parameter string for media playback / downloads.
 */
function signMediaAccess({ filename, tenantId, ttlSeconds = 3600, secret }) {
  if (!filename) throw new Error('FILENAME_REQUIRED');
  const base = path.basename(filename);
  const tid = String(tenantId || 'anonymous');
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signingSecret = getSigningSecret(secret);

  const payload = `${base}:${tid}:${exp}`;
  const sig = crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');

  return {
    filename: base,
    tenantId: tid,
    exp,
    sig,
    token: `${sig}.${exp}.${tid}`,
    queryString: `sig=${sig}&exp=${exp}&tid=${encodeURIComponent(tid)}`
  };
}

/**
 * Verifies whether an incoming HTTP request is authorized to read the requested media file.
 */
function verifyMediaAccess({ req, filename, ownerTenant, isInternalWorker = false, secret }) {
  // 1. Internal worker or loopback control requests are always authorized
  if (isInternalWorker) {
    return { allowed: true, reason: 'internal_worker' };
  }

  // 2. Gateway Master Token in Authorization header
  const authHeader = req.headers?.['authorization'] || '';
  const gatewayToken = process.env.OMNISTUDIO_GATEWAY_TOKEN || '';
  if (gatewayToken && authHeader.toLowerCase() === `bearer ${gatewayToken.toLowerCase()}`) {
    return { allowed: true, reason: 'gateway_admin_token' };
  }

  const base = path.basename(filename);
  const actualOwner = ownerTenant || getMediaOwner(base);

  // 3. Header-based Tenant Authorization
  const reqTenant = req.headers?.['x-tenant-id'];
  if (reqTenant) {
    if (actualOwner && reqTenant !== actualOwner) {
      return { allowed: false, statusCode: 403, error: 'CROSS_TENANT_ACCESS_DENIED' };
    }
    return { allowed: true, reason: 'tenant_header', tenantId: reqTenant };
  }

  // 4. Query-based Signed Token Authorization (for <img>, <video>, downloads)
  const parsedUrl = new URL(req.url, 'http://localhost');
  const sig = parsedUrl.searchParams.get('sig');
  const expStr = parsedUrl.searchParams.get('exp');
  const tid = parsedUrl.searchParams.get('tid') || parsedUrl.searchParams.get('tenantId');
  const token = parsedUrl.searchParams.get('token');

  let signature = sig;
  let expiry = expStr ? parseInt(expStr, 10) : null;
  let tokenTenant = tid;

  if (token && (!signature || !expiry)) {
    const parts = token.split('.');
    if (parts.length === 3) {
      signature = parts[0];
      expiry = parseInt(parts[1], 10);
      tokenTenant = parts[2];
    }
  }

  if (signature && expiry && tokenTenant) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec > expiry) {
      return { allowed: false, statusCode: 401, error: 'MEDIA_SIGNATURE_EXPIRED' };
    }

    const signingSecret = getSigningSecret(secret);
    const expectedPayload = `${base}:${tokenTenant}:${expiry}`;
    const expectedSig = crypto.createHmac('sha256', signingSecret).update(expectedPayload).digest('hex');

    try {
      const match = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSig, 'hex')
      );
      if (!match) {
        return { allowed: false, statusCode: 401, error: 'INVALID_MEDIA_SIGNATURE' };
      }
    } catch (_) {
      return { allowed: false, statusCode: 401, error: 'INVALID_MEDIA_SIGNATURE' };
    }

    // Check cross-tenant access against actual owner
    if (actualOwner && tokenTenant !== actualOwner) {
      return { allowed: false, statusCode: 403, error: 'CROSS_TENANT_ACCESS_DENIED' };
    }

    return { allowed: true, reason: 'signed_url', tenantId: tokenTenant };
  }

  // 5. If no authorization provided, deny anonymous access to private media
  return { allowed: false, statusCode: 401, error: 'UNAUTHORIZED_MEDIA_ACCESS' };
}

module.exports = {
  isMediaFilename,
  isPublicMediaFilename,
  registerMediaOwner,
  getMediaOwner,
  clearMediaRegistry,
  signMediaAccess,
  verifyMediaAccess,
};
