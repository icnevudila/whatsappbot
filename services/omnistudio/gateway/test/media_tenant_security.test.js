'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

// Setup isolated directories
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-security-test-'));
const outputDir = path.join(tempDir, 'outputs');
fs.mkdirSync(outputDir, { recursive: true });

process.env.OUTPUT_DIR = outputDir;
process.env.MEDIA_SIGNING_SECRET = 'test-secret-salt-2026';
process.env.OMNISTUDIO_GATEWAY_TOKEN = 'test-gateway-admin-token';
process.env.WORKER_CONTROL_TOKEN = 'test-worker-control-secret';
process.env.PORT = '0';

const {
  registerMediaOwner,
  getMediaOwner,
  signMediaAccess,
  verifyMediaAccess,
  clearMediaRegistry
} = require('../public_output_access.js');
const { server } = require('../server.js');

let serverPort;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      baseUrl = `http://127.0.0.1:${serverPort}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  await new Promise((resolve) => server.close(resolve));
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  clearMediaRegistry();
});

test('GATEWAY MEDIA PRIVACY: Anonymous access to generated image is rejected (401)', async () => {
  const filename = 'brand_isolated_product.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('fake-png-content'));
  registerMediaOwner(filename, 'tenant-alpha');

  const res = await fetch(`${baseUrl}/outputs/${filename}`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'UNAUTHORIZED_MEDIA_ACCESS');
});

test('GATEWAY MEDIA PRIVACY: Tenant B accessing Tenant A media is rejected (403 Cross-Tenant)', async () => {
  const filename = 'alpha_confidential_design.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('alpha-secret-image'));
  registerMediaOwner(filename, 'tenant-alpha');

  const res = await fetch(`${baseUrl}/outputs/${filename}`, {
    headers: { 'X-Tenant-Id': 'tenant-beta' }
  });
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error, 'CROSS_TENANT_ACCESS_DENIED');
});

test('GATEWAY MEDIA PRIVACY: Tenant A accessing own media with X-Tenant-Id succeeds (200)', async () => {
  const filename = 'alpha_allowed_design.png';
  const content = 'alpha-verified-image-bytes';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(content));
  registerMediaOwner(filename, 'tenant-alpha');

  const res = await fetch(`${baseUrl}/outputs/${filename}`, {
    headers: { 'X-Tenant-Id': 'tenant-alpha' }
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  const bodyText = await res.text();
  assert.equal(bodyText, content);
});

test('GATEWAY MEDIA PRIVACY: Signed URL allows HTML image tags for correct tenant (200)', async () => {
  const filename = 'campaign_banner_signed.png';
  const content = 'banner-pixels';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(content));
  registerMediaOwner(filename, 'tenant-alpha');

  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-alpha',
    ttlSeconds: 300,
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  const res = await fetch(`${baseUrl}/outputs/${filename}?${signed.queryString}`);
  assert.equal(res.status, 200);
  const bodyText = await res.text();
  assert.equal(bodyText, content);
});

test('GATEWAY MEDIA PRIVACY: Tampered signature on signed URL is rejected (401)', async () => {
  const filename = 'secure_contract_asset.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('sensitive-bytes'));
  registerMediaOwner(filename, 'tenant-alpha');

  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-alpha',
    ttlSeconds: 300,
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  // Tamper signature by changing last character
  const badSig = signed.sig.slice(0, -1) + (signed.sig.endsWith('0') ? '1' : '0');
  const res = await fetch(`${baseUrl}/outputs/${filename}?sig=${badSig}&exp=${signed.exp}&tid=${signed.tenantId}`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'INVALID_MEDIA_SIGNATURE');
});

test('GATEWAY MEDIA PRIVACY: Expired signature on signed URL is rejected (401)', async () => {
  const filename = 'expired_promo_video.mp4';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('video-bytes-chunk'));
  registerMediaOwner(filename, 'tenant-alpha');

  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-alpha',
    ttlSeconds: -10, // already expired in the past
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  const res = await fetch(`${baseUrl}/outputs/${filename}?${signed.queryString}`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'MEDIA_SIGNATURE_EXPIRED');
});

test('GATEWAY MEDIA STREAMING: Authorized video supports HTTP 206 Partial Content range requests', async () => {
  const filename = 'tenant_commercial_video.mp4';
  const videoBuffer = Buffer.alloc(1000, 0x42); // 1000 bytes of dummy video
  fs.writeFileSync(path.join(outputDir, filename), videoBuffer);
  registerMediaOwner(filename, 'tenant-video-org');

  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-video-org',
    ttlSeconds: 600,
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  // Request byte range 0-199 (first 200 bytes)
  const res = await fetch(`${baseUrl}/outputs/${filename}?${signed.queryString}`, {
    headers: { Range: 'bytes=0-199' }
  });

  assert.equal(res.status, 206, 'Should respond with 206 Partial Content');
  assert.equal(res.headers.get('content-range'), 'bytes 0-199/1000');
  assert.equal(res.headers.get('content-length'), '200');
  assert.equal(res.headers.get('content-type'), 'video/mp4');

  const arrayBuf = await res.arrayBuffer();
  assert.equal(arrayBuf.byteLength, 200);
});

test('GATEWAY WORKER AUTH: Internal worker request with token accesses media directly', async () => {
  const filename = 'worker_internal_output.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('worker-bytes'));
  registerMediaOwner(filename, 'tenant-internal');

  const res = await fetch(`${baseUrl}/outputs/${filename}`, {
    headers: { 'Authorization': `Bearer ${process.env.OMNISTUDIO_GATEWAY_TOKEN}` }
  });
  assert.equal(res.status, 200);
});
