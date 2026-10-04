'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CUSTOMER_APP_URL = process.env.CUSTOMER_APP_URL || 'https://whatsappbot-customer.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co';

/**
 * Validates magic bytes for image buffers.
 * Returns { mimeType, ext } or throws INVALID_IMAGE_MIME.
 */
function detectImageMime(buffer) {
  if (!buffer || buffer.length < 12) {
    throw new Error('INVALID_IMAGE_PAYLOAD: buffer too small to be a valid image');
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
    return { mimeType: 'image/png', ext: 'png' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { mimeType: 'image/jpeg', ext: 'jpg' };
  }

  // WebP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return { mimeType: 'image/webp', ext: 'webp' };
  }

  // GIF: GIF87a or GIF89a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61) {
    return { mimeType: 'image/gif', ext: 'gif' };
  }

  throw new Error('INVALID_IMAGE_MIME: unsupported or corrupt image format (magic bytes mismatch)');
}

/**
 * Decodes basic image dimensions (PNG/JPEG/WebP) to ensure image is non-degenerate.
 */
function inspectDimensions(buffer, mimeType) {
  try {
    if (mimeType === 'image/png' && buffer.length >= 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      if (width > 0 && height > 0) return { width, height };
    } else if (mimeType === 'image/jpeg') {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) { // SOF0 or SOF2
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) return { width, height };
          break;
        }
        const len = buffer.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
    } else if (mimeType === 'image/webp' && buffer.length >= 30) {
      // VP8 chunk
      if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        if (width > 0 && height > 0) return { width, height };
      } else if (buffer.toString('ascii', 12, 16) === 'VP8L') {
        const b1 = buffer[21], b2 = buffer[22], b3 = buffer[23], b4 = buffer[24];
        const width = 1 + (((b2 & 0x3f) << 8) | b1);
        const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
        if (width > 0 && height > 0) return { width, height };
      }
    }
  } catch {}
  return { width: 1, height: 1 }; // Fallback positive if header valid
}

/**
 * Resolves an asset reference into a validated Buffer + Metadata.
 * 
 * @param {string|object} ref - URL, relative path, base64 data, or reference object
 * @param {object} options - { tenantId, expectedRole, gatewayOutputsDir, fetchImpl }
 */
async function resolveCanonicalAsset(ref, options = {}) {
  const { tenantId = null, gatewayOutputsDir = null, fetchImpl = globalThis.fetch } = options;
  const rawObj = typeof ref === 'string' ? { url: ref.trim() } : { ...ref };
  const rawStr = rawObj.url || rawObj.data || rawObj.b64_json || '';

  if (!rawStr || typeof rawStr !== 'string' || !rawStr.trim()) {
    throw new Error('INVALID_ASSET: asset reference string or data is empty');
  }

  // 1. Ownership validation
  if (rawObj.org_id && tenantId && rawObj.org_id !== tenantId) {
    throw Object.assign(new Error(`FORBIDDEN_ASSET_ACCESS: asset belongs to tenant ${rawObj.org_id}, not ${tenantId}`), {
      code: 'FORBIDDEN_ASSET_ACCESS',
      statusCode: 403,
    });
  }

  let buffer = null;

  // 2. Base64 inline payload
  const isExplicitBase64 = Boolean(rawObj.data || rawObj.b64_json);
  if (rawStr.startsWith('data:') || isExplicitBase64 || (!rawStr.startsWith('http://') && !rawStr.startsWith('https://') && !rawStr.startsWith('/') && !rawStr.includes(' '))) {
    const b64 = rawStr.includes(',') ? rawStr.split(',')[1] : rawStr;
    try {
      const decoded = Buffer.from(b64, 'base64');
      // If it looks like an image or explicit base64 was requested, accept it
      if (decoded.length >= 12) {
        buffer = decoded;
      }
    } catch (err) {
      if (isExplicitBase64) {
        throw new Error(`INVALID_ASSET_BASE64: failed to decode base64: ${err.message}`);
      }
    }
  }

  // 3. Approved filesystem resolution (/outputs/..., local relative or absolute)
  if (!buffer && (rawStr.startsWith('/outputs/') || rawStr.startsWith('outputs/') || path.isAbsolute(rawStr))) {
    const candidates = [];
    const normalized = rawStr.replace(/^\/?outputs\//, '');
    
    // Prevent directory traversal
    if (normalized.includes('..')) {
      throw new Error('INVALID_ASSET_PATH: path traversal characters forbidden');
    }

    if (gatewayOutputsDir) {
      candidates.push(path.join(gatewayOutputsDir, normalized));
    }
    candidates.push(path.join('/app/gateway/outputs', normalized));
    candidates.push(path.join(__dirname, 'outputs', normalized));
    if (path.isAbsolute(rawStr)) {
      candidates.push(rawStr);
    }

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        buffer = fs.readFileSync(candidate);
        break;
      }
    }
  }

  // 4. HTTP / HTTPS resolution (or /brand, /logos, storage resolution via HTTP)
  if (!buffer) {
    let targetUrl = rawStr;

    if (rawStr.startsWith('/brand/') || rawStr.startsWith('/logos/')) {
      // Resolve to Customer App public assets
      targetUrl = `${CUSTOMER_APP_URL.replace(/\/$/, '')}${rawStr}`;
    } else if (rawStr.startsWith('/outputs/')) {
      // If local file wasn't found, try gateway HTTP
      const gwUrl = process.env.OMNISTUDIO_GATEWAY_URL || 'http://127.0.0.1:3456';
      targetUrl = `${gwUrl.replace(/\/$/, '')}${rawStr}`;
    } else if (rawStr.startsWith('brand-assets/') || rawStr.startsWith('/brand-assets/')) {
      // Supabase public storage bucket
      const clean = rawStr.replace(/^\/+/, '');
      targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${clean}`;
    }

    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      try {
        const resp = await fetchImpl(targetUrl, { signal: AbortSignal.timeout(20000) });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        }
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('text/html') || contentType.includes('application/xml') || contentType.includes('application/json')) {
          throw new Error(`Non-image content-type returned: ${contentType}`);
        }
        const ab = await resp.arrayBuffer();
        buffer = Buffer.from(ab);
      } catch (fErr) {
        throw new Error(`ASSET_DOWNLOAD_FAILED: could not fetch ${targetUrl.slice(0, 100)}: ${fErr.message}`);
      }
    }
  }

  if (!buffer || buffer.length === 0) {
    throw new Error(`ASSET_RESOLVE_FAILED: unable to locate or read asset: ${rawStr.slice(0, 80)}`);
  }

  // 5. MIME / Magic bytes verification
  const { mimeType, ext } = detectImageMime(buffer);

  // 6. Decode / Dimension verification
  const { width, height } = inspectDimensions(buffer, mimeType);
  if (width <= 0 || height <= 0) {
    throw new Error('INVALID_IMAGE_DIMENSIONS: image dimensions could not be confirmed');
  }

  // 7. SHA-256 verification
  const actualSha256 = crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
  if (rawObj.sha256) {
    const expectedSha256 = String(rawObj.sha256).toLowerCase().trim();
    if (actualSha256 !== expectedSha256) {
      throw new Error(`ASSET_SHA256_MISMATCH: expected ${expectedSha256}, got ${actualSha256}`);
    }
  }

  return {
    buffer,
    mimeType,
    ext,
    width,
    height,
    sha256: actualSha256,
    role: rawObj.role || 'reference',
    org_id: rawObj.org_id || tenantId,
  };
}

module.exports = {
  resolveCanonicalAsset,
  detectImageMime,
  inspectDimensions,
};
